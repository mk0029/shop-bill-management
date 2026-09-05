/**
 * Client Factory — Creates and caches Sanity clients with error classification.
 *
 * This is the ONLY place in the codebase that instantiates @sanity/client instances.
 * All other modules obtain clients through this factory.
 *
 * Clients are cached per database key to avoid re-instantiation.
 */

import { createClient, type SanityClient } from "@sanity/client";
import {
  getDatabase,
  getDatabaseToken,
  DEFAULT_DATABASE_KEY,
  DEFAULT_API_VERSION,
} from "./database-registry";
import { classifyError, isRetryable } from "./error-classifier";
import type { SanityDatabaseConfig, ErrorCategory } from "./types";

// ─── Client Cache ──────────────────────────────────────────────

const clientCache = new Map<string, SanityClient>();

// ─── Client Creation ───────────────────────────────────────────

/**
 * Get (or create from cache) a Sanity client for a given database key.
 *
 * @param databaseKey - The application-level key (e.g. "primary", "inventory")
 * @returns A SanityClient configured for that database
 * @throws Error if the database key is not found or is disabled
 */
export function getSanityClient(databaseKey: string = DEFAULT_DATABASE_KEY): SanityClient {
  const existing = clientCache.get(databaseKey);
  if (existing) return existing;

  const config = getDatabase(databaseKey);
  if (!config) {
    throw new Error(
      `[client-factory] No database found for key "${databaseKey}". ` +
      `Available keys: ${getRegisteredKeys().join(", ") || "(none)"}`
    );
  }
  if (!config.enabled) {
    throw new Error(
      `[client-factory] Database "${databaseKey}" is disabled.`
    );
  }

  const client = createClientFromConfig(config);
  clientCache.set(databaseKey, client);
  return client;
}

/**
 * Create a fresh Sanity client directly from a config object (no caching).
 * Use this for one-off requests or testing.
 */
export function createClientFromConfig(config: SanityDatabaseConfig): SanityClient {
  const token = getDatabaseToken(config.key);

  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    useCdn: config.useCdn ?? false,
    ...(token ? { token } : {}),
  });
}

/**
 * Get a read-only client for the default database.
 * If the default has a write token, it's fine — the caller is responsible
 * for only performing reads.
 */
export function getReadOnlyClient(databaseKey: string = DEFAULT_DATABASE_KEY): SanityClient {
  return getSanityClient(databaseKey);
}

/**
 * Evict a cached client so a new one is created on next access.
 */
export function evictClient(databaseKey: string): boolean {
  return clientCache.delete(databaseKey);
}

/**
 * Evict all cached clients (e.g. after a configuration refresh).
 */
export function evictAllClients(): void {
  clientCache.clear();
}

/**
 * List all database keys that currently have cached clients.
 */
export function getCachedKeys(): string[] {
  return Array.from(clientCache.keys());
}

/**
 * List all registered database keys (cached or not).
 */
export function getRegisteredKeys(): string[] {
  // We import this dynamically to avoid circular deps in some bundlers
  try {
    const { getDatabaseList } = require("./database-registry");
    return getDatabaseList().map((d: SanityDatabaseConfig) => d.key);
  } catch {
    return [];
  }
}

// ─── Error-Aware Client Operations ─────────────────────────────
// These wrap common operations with error classification to support
// failover decisions in the write router.

export interface ClientResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCategory: ErrorCategory;
  isRetryable: boolean;
  durationMs: number;
  databaseKey: string;
}

/**
 * Execute a function with a Sanity client, catching and classifying errors.
 * This is used by the write router to decide whether to failover.
 */
export async function executeWithClient<T>(
  databaseKey: string,
  operation: (client: SanityClient) => Promise<T>
): Promise<ClientResult<T>> {
  const start = Date.now();
  try {
    const client = getSanityClient(databaseKey);
    const data = await operation(client);
    return {
      success: true,
      data,
      errorCategory: "UNKNOWN", // not used on success
      isRetryable: false,
      durationMs: Date.now() - start,
      databaseKey,
    };
  } catch (err) {
    const category = classifyError(err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      errorCategory: category,
      isRetryable: isRetryable(category),
      durationMs: Date.now() - start,
      databaseKey,
    };
  }
}
