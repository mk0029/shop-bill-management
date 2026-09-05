/**
 * Read Router — Purpose-based read routing with aggregation support.
 *
 * Supports two modes:
 *   1. Single-DB reads: Target a specific database (fast, for known locations)
 *   2. Aggregated reads: Load from view DB first, background sync from all DBs
 *
 * The router automatically handles:
 *   - View priority for first-load speed
 *   - Preferred database memory
 *   - Document location indexing
 *   - Multi-DB per role aggregation
 */

import { getSanityClient, executeWithClient } from "./client-factory";
import {
  getReadableDatabases,
  getDatabase,
  getViewDatabase,
  getBackgroundDatabases,
  getDatabasesByViewPriority,
  DEFAULT_DATABASE_KEY,
} from "./database-registry";
import { getPreferredDatabase, recordPreferredDatabase } from "./preferred-database";
import { recordDocumentLocation } from "./document-location-index";
import { aggregateDocuments, aggregateDocumentsSimple } from "./aggregation-engine";
import type { SanityDatabaseConfig, AggregatedResult, AggregationOptions } from "./types";
import type { SanityClient } from "@sanity/client";

// ─── Read Resolution ───────────────────────────────────────────

/**
 * Resolve which database to read from for a given purpose.
 * Returns the database config, NOT a client.
 *
 * @param purpose - The data category (e.g. "inventory", "bills", "users")
 * @param hint - Optional: force a specific database key
 * @returns The resolved database config
 */
export function resolveReadDatabase(
  purpose: string,
  hint?: string
): SanityDatabaseConfig {
  // 1. Explicit hint takes highest priority
  if (hint) {
    const db = getDatabase(hint);
    if (db && db.enabled && db.readable) return db;
  }

  // 2. Check preferred database memory
  const preferredKey = getPreferredDatabase(purpose);
  if (preferredKey) {
    const db = getDatabase(preferredKey);
    if (db && db.enabled && db.readable && db.purpose.includes(purpose)) {
      return db;
    }
  }

  // 3. Use view priority — lowest viewPriority = fastest load
  const viewDb = getViewDatabase(purpose);
  if (viewDb) return viewDb;

  // 4. Fall back to default database
  const fallback = getDatabase(DEFAULT_DATABASE_KEY);
  if (!fallback) {
    throw new Error(
      `[read-router] No readable database found for purpose "${purpose}" ` +
      `and no default database configured.`
    );
  }
  return fallback;
}

/**
 * Get a Sanity client for reading, resolved by purpose.
 */
export function getReadClient(purpose: string, hint?: string): SanityClient {
  const db = resolveReadDatabase(purpose, hint);
  return getSanityClient(db.key);
}

// ─── Single-DB Read Operations ─────────────────────────────────
// These read from a SINGLE database. Use for known document locations.

/**
 * Fetch a single document by ID from a specific database.
 */
export async function getDocument(
  documentId: string,
  purpose: string,
  hint?: string
): Promise<{ data: Record<string, unknown> | null; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const doc = await client.getDocument(documentId);
  const data = doc ?? null;
  if (data) {
    recordDocumentLocation(documentId, db.key, db.projectId, db.dataset, (data as Record<string, unknown>)._type as string);
  }

  return { data, databaseKey: db.key };
}

/**
 * Fetch multiple documents by ID from a specific database.
 */
export async function getDocumentsByIds(
  documentIds: string[],
  purpose: string,
  hint?: string
): Promise<{ data: Record<string, unknown>[]; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const query = `*[_id in $ids]`;
  const data = await client.fetch<Record<string, unknown>[]>(query, { ids: documentIds });

  for (const doc of data) {
    if (doc._id) {
      recordDocumentLocation(doc._id as string, db.key, db.projectId, db.dataset, doc._type as string);
    }
  }

  return { data, databaseKey: db.key };
}

/**
 * Run a GROQ query against a specific database.
 */
export async function queryDocuments<T = Record<string, unknown>>(
  groqQuery: string,
  params: Record<string, unknown>,
  purpose: string,
  hint?: string
): Promise<{ data: T[]; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const data = await client.fetch<T[]>(groqQuery, params);
  return { data, databaseKey: db.key };
}

/**
 * Run a GROQ query that returns a single result.
 */
export async function querySingleDocument<T = Record<string, unknown>>(
  groqQuery: string,
  params: Record<string, unknown>,
  purpose: string,
  hint?: string
): Promise<{ data: T | null; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const data = await client.fetch<T | null>(groqQuery, params);
  return { data, databaseKey: db.key };
}

/**
 * Search across a specific database with a text query.
 */
export async function searchDocuments(
  documentType: string,
  searchText: string,
  purpose: string,
  hint?: string
): Promise<{ data: Record<string, unknown>[]; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const groqQuery = `*[(_type == $type) && (name match $text || title match $text || slug.current match $text)]`;
  const data = await client.fetch<Record<string, unknown>[]>(groqQuery, {
    type: documentType,
    text: `*${searchText}*`,
  });

  return { data, databaseKey: db.key };
}

/**
 * Count documents of a given type in a database.
 */
export async function countDocuments(
  documentType: string,
  purpose: string,
  hint?: string
): Promise<{ count: number; databaseKey: string }> {
  const db = resolveReadDatabase(purpose, hint);
  const client = getSanityClient(db.key);

  const count = await client.fetch<number>(
    `count(*[_type == $type])`,
    { type: documentType }
  );

  return { count, databaseKey: db.key };
}

// ─── Aggregated Read Operations ────────────────────────────────
// These read from MULTIPLE databases with 2-phase loading.

/**
 * Aggregate documents from all databases serving a purpose.
 * Uses view priority for fast first load + background sync.
 *
 * @example
 * ```ts
 * const result = await aggregateRead({
 *   purpose: "inventory",
 *   groqQuery: `*[_type == "product"] | order(name asc)`,
 *   onProgress: (p) => {
 *     if (p.phase === "initial") setProducts(result.viewDocuments);
 *     if (p.phase === "complete") setProducts(result.documents);
 *   },
 * });
 * ```
 */
export async function aggregateRead<T = Record<string, unknown>>(
  options: {
    purpose: string;
    groqQuery: string;
    params?: Record<string, unknown>;
    databaseKeys?: string[];
    initialTimeoutMs?: number;
    totalTimeoutMs?: number;
    onProgress?: (progress: { phase: string; loadedDatabases: number; totalDatabases: number; documentsSoFar: number }) => void;
    deduplicate?: boolean;
    mergeStrategy?: "newest" | "view-db" | "all";
    sortFn?: (a: any, b: any) => number;
    filterFn?: (doc: any) => boolean;
  }
): Promise<AggregatedResult<T>> {
  return aggregateDocuments<T>({
    purpose: options.purpose,
    groqQuery: options.groqQuery,
    params: options.params,
    databaseKeys: options.databaseKeys,
    initialTimeoutMs: options.initialTimeoutMs,
    totalTimeoutMs: options.totalTimeoutMs,
    deduplicate: options.deduplicate,
    mergeStrategy: options.mergeStrategy,
    sortFn: options.sortFn,
    filterFn: options.filterFn,
    onProgress: options.onProgress as any,
  });
}

/**
 * Simple aggregate: fetch from all DBs, return merged results.
 * No progress callback, no phased loading.
 */
export async function aggregateReadSimple<T = Record<string, unknown>>(
  purpose: string,
  groqQuery: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  return aggregateDocumentsSimple<T>(purpose, groqQuery, params);
}

/**
 * Read across ALL databases for a purpose.
 * Returns results grouped by database key.
 */
export async function readAcrossDatabases<T = Record<string, unknown>>(
  groqQuery: string,
  params: Record<string, unknown>,
  purpose: string
): Promise<{ results: Array<{ databaseKey: string; data: T[]; error?: string }> }> {
  const dbs = getReadableDatabases(purpose);

  const results: Array<{ databaseKey: string; data: T[]; error?: string }> = [];

  for (const db of dbs) {
    try {
      const client = getSanityClient(db.key);
      const data = await client.fetch<T[]>(groqQuery, params);
      results.push({ databaseKey: db.key, data });
    } catch (err) {
      results.push({
        databaseKey: db.key,
        data: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { results };
}

// ─── Record Successful Read ────────────────────────────────────

export function recordReadSuccess(purpose: string, databaseKey: string): void {
  recordPreferredDatabase(purpose, databaseKey);
}
