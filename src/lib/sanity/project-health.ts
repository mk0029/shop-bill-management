/**
 * Project Health — Legacy wrapper for backward compatibility.
 *
 * @deprecated Use database-health.ts instead.
 */

import { getSanityClient } from "./client-factory";
import { getDatabase, getAllEnabledDatabases } from "./database-registry";
import type { DatabaseHealthEntry, DatabaseHealthStatus } from "./types";

export type ProjectHealthStatus = DatabaseHealthEntry & {
  projectKey: string;
  configuredLimit: number | null;
  remainingCapacity: number | null;
};

/**
 * Check the health of a single database (legacy API).
 */
export async function getProjectStatus(
  projectKey: string
): Promise<ProjectHealthStatus> {
  const config = getDatabase(projectKey);

  const baseStatus: ProjectHealthStatus = {
    key: projectKey,
    projectKey,
    role: config?.role || "unknown",
    label: config?.label || projectKey,
    status: "disabled",
    readable: config?.readable ?? false,
    writable: config?.writable ?? false,
    enabled: config?.enabled ?? false,
    documentCount: null,
    maxDocuments: config?.maxDocuments ?? null,
    configuredLimit: config?.maxDocuments ?? null,
    remainingCapacity: null,
    lastChecked: new Date().toISOString(),
  };

  if (!config || !config.enabled) {
    return baseStatus;
  }

  try {
    const client = getSanityClient(projectKey);
    const countResult = await client.fetch<{ count: number }>(
      `count(*[_type != "_health"])`
    );

    const docCount = typeof countResult === "number"
      ? countResult
      : (countResult as any)?.count ?? null;

    let status: DatabaseHealthStatus = "healthy";
    if (config.maxDocuments != null && docCount != null) {
      if (docCount >= config.maxDocuments) {
        status = "degraded";
      } else if (config.safetyThreshold != null && docCount >= config.safetyThreshold) {
        status = "degraded";
      }
    }

    return {
      ...baseStatus,
      status,
      documentCount: docCount,
      remainingCapacity:
        config.maxDocuments != null && docCount != null
          ? Math.max(0, config.maxDocuments - docCount)
          : null,
    };
  } catch (error) {
    return {
      ...baseStatus,
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check the health of all enabled databases (legacy API).
 */
export async function getAllProjectStatuses(): Promise<ProjectHealthStatus[]> {
  const databases = getAllEnabledDatabases();

  const results = await Promise.allSettled(
    databases.map((db) => getProjectStatus(db.key))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      key: databases[i].key,
      projectKey: databases[i].key,
      role: databases[i].role,
      label: databases[i].label,
      status: "unreachable" as DatabaseHealthStatus,
      readable: databases[i].readable,
      writable: databases[i].writable,
      enabled: databases[i].enabled,
      documentCount: null,
      maxDocuments: databases[i].maxDocuments ?? null,
      configuredLimit: databases[i].maxDocuments ?? null,
      remainingCapacity: null,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      lastChecked: new Date().toISOString(),
    };
  });
}

/**
 * Get a summary of all database health statuses (legacy API).
 */
export async function getProjectsHealthSummary(): Promise<{
  total: number;
  enabled: number;
  reachable: number;
  unreachable: number;
  totalDocuments: number;
  projects: ProjectHealthStatus[];
}> {
  const statuses = await getAllProjectStatuses();
  const enabled = statuses.filter((s) => s.enabled);

  return {
    total: statuses.length,
    enabled: enabled.length,
    reachable: enabled.filter((s) => s.status === "healthy" || s.status === "degraded").length,
    unreachable: enabled.filter((s) => s.status === "unreachable" || s.status === "disabled").length,
    totalDocuments: enabled.reduce(
      (sum, s) => sum + (s.documentCount || 0),
      0
    ),
    projects: statuses,
  };
}

/**
 * Get document type counts for a specific database (legacy API).
 */
export async function getProjectDocumentTypeCounts(
  projectKey: string
): Promise<Map<string, number> | null> {
  try {
    const client = getSanityClient(projectKey);
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
