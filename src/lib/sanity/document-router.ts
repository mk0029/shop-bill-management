/**
 * Document Router — Legacy CRUD operations with explicit project targeting.
 *
 * This file is maintained for backward compatibility with existing API routes.
 * New code should use read-router.ts and write-router.ts instead.
 *
 * Key difference from Phase 1: Uses database key terminology but maps
 * to the same underlying operations.
 */

import { getSanityClient } from "./client-factory";
import { getDatabase, getAllEnabledDatabases, DEFAULT_DATABASE_KEY } from "./database-registry";
import { toUnifiedDocument, toUnifiedDocuments } from "./unified-document";
import type { UnifiedDocument } from "./types";

// ─── READ ──────────────────────────────────────────────────────

/**
 * Fetch a single document by ID from a specific database.
 */
export async function getDocument({
  projectKey,
  documentId,
}: {
  projectKey: string;
  documentId: string;
}): Promise<UnifiedDocument | null> {
  const startTime = Date.now();
  try {
    const client = getSanityClient(projectKey);
    const config = getDatabase(projectKey);
    if (!config) throw new Error(`Unknown database: ${projectKey}`);

    const doc = await client.fetch(
      `*[_id == $id][0]`,
      { id: documentId }
    );

    if (!doc) return null;

    return toUnifiedDocument(doc, projectKey, config.projectId, config.dataset);
  } catch (error) {
    logAndThrow("fetch", projectKey, documentId, startTime, error);
    return null;
  }
}

/**
 * Fetch multiple documents by GROQ query from a specific database.
 */
export async function queryDocuments<T = Record<string, unknown>>(
  projectKey: string,
  groqQuery: string,
  params?: Record<string, unknown>
): Promise<UnifiedDocument[]> {
  const startTime = Date.now();
  try {
    const client = getSanityClient(projectKey);
    const config = getDatabase(projectKey);
    if (!config) throw new Error(`Unknown database: ${projectKey}`);

    const results = params
      ? await client.fetch<T[]>(groqQuery, params as any)
      : await client.fetch<T[]>(groqQuery);
    if (!Array.isArray(results)) return [];

    return toUnifiedDocuments(
      results as Record<string, unknown>[],
      projectKey,
      config.projectId,
      config.dataset
    );
  } catch (error) {
    logAndThrow("fetch", projectKey, undefined, startTime, error);
    return [];
  }
}

/**
 * Fetch a single document by GROQ query from a specific database.
 */
export async function queryDocument<T = Record<string, unknown>>(
  projectKey: string,
  groqQuery: string,
  params?: Record<string, unknown>
): Promise<UnifiedDocument | null> {
  const startTime = Date.now();
  try {
    const client = getSanityClient(projectKey);
    const config = getDatabase(projectKey);
    if (!config) throw new Error(`Unknown database: ${projectKey}`);

    const doc = params
      ? await client.fetch<T | null>(groqQuery, params as any)
      : await client.fetch<T | null>(groqQuery);
    if (!doc) return null;

    return toUnifiedDocument(
      doc as Record<string, unknown>,
      projectKey,
      config.projectId,
      config.dataset
    );
  } catch (error) {
    logAndThrow("fetch", projectKey, undefined, startTime, error);
    return null;
  }
}

// ─── SEARCH ACROSS DATABASES ───────────────────────────────────

/**
 * Search for documents matching a query across all enabled databases.
 */
export async function queryAllProjects(
  groqQuery: string,
  params?: Record<string, unknown>
): Promise<UnifiedDocument[]> {
  const databases = getAllEnabledDatabases();
  const results = await Promise.allSettled(
    databases.map(async (db) => {
      try {
        const client = getSanityClient(db.key);
        const docs = params
          ? await client.fetch<Record<string, unknown>[]>(groqQuery, params as any)
          : await client.fetch<Record<string, unknown>[]>(groqQuery);
        if (!Array.isArray(docs)) return [];
        return toUnifiedDocuments(docs, db.key, db.projectId, db.dataset);
      } catch {
        return [];
      }
    })
  );

  const unified: UnifiedDocument[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      unified.push(...result.value);
    }
  }
  return unified;
}

// ─── CREATE ────────────────────────────────────────────────────

export async function createDocument(
  options: {
    projectKey?: string;
    document: Record<string, unknown>;
    routingStrategy?: string;
  }
): Promise<UnifiedDocument> {
  const startTime = Date.now();
  const projectKey = options.projectKey || selectProjectForNewDocument();

  try {
    const client = getSanityClient(projectKey);
    const config = getDatabase(projectKey);
    if (!config) throw new Error(`Unknown database: ${projectKey}`);

    const created = await client.create({
      ...options.document,
      _type: options.document._type || "document",
    } as any);

    return toUnifiedDocument(
      created as unknown as Record<string, unknown>,
      projectKey,
      config.projectId,
      config.dataset
    );
  } catch (error) {
    logAndThrow("create", projectKey, undefined, startTime, error);
    throw error;
  }
}

// ─── UPDATE ────────────────────────────────────────────────────

export async function updateDocument(
  options: {
    projectKey: string;
    documentId: string;
    patch: Record<string, unknown>;
  }
): Promise<UnifiedDocument> {
  const startTime = Date.now();
  try {
    const client = getSanityClient(options.projectKey);
    const config = getDatabase(options.projectKey);
    if (!config) throw new Error(`Unknown database: ${options.projectKey}`);

    const updated = await client
      .patch(options.documentId)
      .set({
        ...options.patch,
        updatedAt: new Date().toISOString(),
      })
      .commit({ returnDocuments: true });

    return toUnifiedDocument(
      updated as unknown as Record<string, unknown>,
      options.projectKey,
      config.projectId,
      config.dataset
    );
  } catch (error) {
    logAndThrow("update", options.projectKey, options.documentId, startTime, error);
    throw error;
  }
}

// ─── DELETE ────────────────────────────────────────────────────

export async function deleteDocument(
  options: {
    projectKey: string;
    documentId: string;
  }
): Promise<void> {
  const startTime = Date.now();
  try {
    const client = getSanityClient(options.projectKey);
    await client.delete(options.documentId);
  } catch (error) {
    logAndThrow("delete", options.projectKey, options.documentId, startTime, error);
    throw error;
  }
}

// ─── DOCUMENT DISTRIBUTION ─────────────────────────────────────

export function selectProjectForNewDocument(): string {
  const enabled = getAllEnabledDatabases();
  if (enabled.length === 0) {
    throw new Error("No enabled Sanity databases available for document creation");
  }
  return enabled[0].key;
}

// ─── BATCH OPERATIONS ──────────────────────────────────────────

export async function batchCreateDocuments(
  documents: Array<{ projectKey: string; document: Record<string, unknown> }>
): Promise<{ projectKey: string; results: UnifiedDocument[]; errors: Error[] }[]> {
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const item of documents) {
    const existing = grouped.get(item.projectKey) || [];
    existing.push(item.document);
    grouped.set(item.projectKey, existing);
  }

  const allResults: Array<{
    projectKey: string;
    results: UnifiedDocument[];
    errors: Error[];
  }> = [];

  for (const [projectKey, docs] of Array.from(grouped.entries())) {
    const results: UnifiedDocument[] = [];
    const errors: Error[] = [];

    for (const doc of docs) {
      try {
        const created = await createDocument({ projectKey, document: doc });
        results.push(created);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    allResults.push({ projectKey, results, errors });
  }

  return allResults;
}

// ─── LOGGING ───────────────────────────────────────────────────

function logAndThrow(
  operation: string,
  projectKey: string,
  documentId: string | undefined,
  startTime: number,
  error: unknown
): never {
  const duration = Date.now() - startTime;
  const message = error instanceof Error ? error.message : String(error);
  const category = classifyError(error);

  console.error(
    `[Sanity:${projectKey}] ${operation} FAILED (${duration}ms) [${category}]:`,
    message
  );

  throw error instanceof Error ? error : new Error(message);
}

function classifyError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (msg.includes("not found") || msg.includes("404")) return "NOT_FOUND";
  if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("403"))
    return "AUTH_ERROR";
  if (msg.includes("rate limit") || msg.includes("429")) return "RATE_LIMIT";
  if (msg.includes("timeout") || msg.includes("etimedout")) return "TIMEOUT";
  if (msg.includes("network") || msg.includes("enotfound")) return "NETWORK_ERROR";
  if (msg.includes("disabled")) return "PROJECT_DISABLED";
  if (msg.includes("invalid") || msg.includes("malformed")) return "INVALID_INPUT";
  return "UNKNOWN";
}
