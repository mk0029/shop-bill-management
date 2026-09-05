/**
 * Database Health — Role-aware health diagnostics for all Sanity databases.
 *
 * Checks each database's connectivity, document count, remaining capacity,
 * and role status. Safe to call at any time; never exposes tokens or
 * sensitive data.
 */

import { getSanityClient } from "./client-factory";
import { getAllEnabledDatabases, getDatabase } from "./database-registry";
import type { SanityDatabaseConfig, DatabaseHealthEntry, DatabaseHealthStatus } from "./types";

/**
 * Check the health of a single database.
 *
 * Attempts a lightweight query to verify reachability,
 * then fetches total document count.
 */
export async function getDatabaseStatus(
  databaseKey: string
): Promise<DatabaseHealthEntry> {
  const config = getDatabase(databaseKey);

  const baseStatus: DatabaseHealthEntry = {
    key: databaseKey,
    role: config?.role || "unknown",
    label: config?.label || databaseKey,
    status: "disabled",
    readable: config?.readable ?? false,
    writable: config?.writable ?? false,
    enabled: config?.enabled ?? false,
    documentCount: null,
    maxDocuments: config?.maxDocuments ?? null,
    lastChecked: new Date().toISOString(),
  };

  if (!config || !config.enabled) {
    return baseStatus;
  }

  const start = Date.now();
  try {
    const client = getSanityClient(databaseKey);

    // Lightweight connectivity + document count
    const countResult = await client.fetch<unknown>(
      `count(*[_type != "_health"])`
    );

    const docCount = typeof countResult === "number"
      ? countResult
      : typeof countResult === "object" && countResult !== null && "count" in (countResult as Record<string, unknown>)
        ? (countResult as { count: number }).count
        : null;

    let status: DatabaseHealthStatus = "healthy";

    // Check if we're approaching capacity
    if (config.maxDocuments != null && docCount != null) {
      if (docCount >= config.maxDocuments) {
        status = "degraded"; // at capacity
      } else if (config.safetyThreshold != null && docCount >= config.safetyThreshold) {
        status = "degraded"; // approaching capacity
      }
    }

    return {
      ...baseStatus,
      status,
      documentCount: docCount,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ...baseStatus,
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check the health of all enabled databases in parallel.
 * Returns results even if some databases fail.
 */
export async function getAllDatabaseStatuses(): Promise<DatabaseHealthEntry[]> {
  const databases = getAllEnabledDatabases();

  const results = await Promise.allSettled(
    databases.map((db) => getDatabaseStatus(db.key))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      key: databases[i].key,
      role: databases[i].role,
      label: databases[i].label,
      status: "unreachable" as DatabaseHealthStatus,
      readable: databases[i].readable,
      writable: databases[i].writable,
      enabled: databases[i].enabled,
      documentCount: null,
      maxDocuments: databases[i].maxDocuments ?? null,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      lastChecked: new Date().toISOString(),
    };
  });
}

/**
 * Get a summary of all database health statuses.
 * Useful for admin dashboards and monitoring.
 */
export async function getDatabasesHealthSummary(): Promise<{
  total: number;
  enabled: number;
  healthy: number;
  degraded: number;
  unreachable: number;
  totalDocuments: number;
  databases: DatabaseHealthEntry[];
}> {
  const statuses = await getAllDatabaseStatuses();
  const enabled = statuses.filter((s) => s.enabled);

  return {
    total: statuses.length,
    enabled: enabled.length,
    healthy: enabled.filter((s) => s.status === "healthy").length,
    degraded: enabled.filter((s) => s.status === "degraded").length,
    unreachable: enabled.filter((s) => s.status === "unreachable").length,
    totalDocuments: enabled.reduce(
      (sum, s) => sum + (s.documentCount || 0),
      0
    ),
    databases: statuses,
  };
}

/**
 * Get document type counts for a specific database.
 * Returns a map of document type → count.
 */
export async function getDatabaseDocumentTypeCounts(
  databaseKey: string
): Promise<Map<string, number> | null> {
  try {
    const client = getSanityClient(databaseKey);
    const counts = await client.fetch<Array<{ type: string; count: number }>>(
      `array::unique(*[]._type)[] {
        "type": @,
        "count": count(*[_type == @])
      }`
    );

    const map = new Map<string, number>();
    for (const item of counts || []) {
      map.set(item.type, item.count);
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * Get health status for databases of a specific role.
 */
export async function getDatabaseStatusByRole(
  role: string
): Promise<DatabaseHealthEntry[]> {
  const all = await getAllDatabaseStatuses();
  return all.filter((s) => s.role === role);
}

/**
 * Check if a specific database is healthy and writable.
 * Useful for pre-flight checks before write operations.
 */
export async function isDatabaseHealthyAndWritable(
  databaseKey: string
): Promise<boolean> {
  const status = await getDatabaseStatus(databaseKey);
  return status.status === "healthy" && status.writable && status.enabled;
}

// ─── Backward Compatibility ────────────────────────────────────

/** @deprecated Use getDatabaseStatus() instead */
export const getProjectStatus = getDatabaseStatus;
/** @deprecated Use getAllDatabaseStatuses() instead */
export const getAllProjectStatuses = getAllDatabaseStatuses;
/** @deprecated Use getDatabasesHealthSummary() instead */
export const getProjectsHealthSummary = getDatabasesHealthSummary;
/** @deprecated Use getDatabaseDocumentTypeCounts() instead */
export const getProjectDocumentTypeCounts = getDatabaseDocumentTypeCounts;
