/**
 * Write Router — Purpose-based write routing with automatic failover.
 *
 * Routing strategy:
 *   1. If a specific databaseKey is requested, try that first
 *   2. Check preferred-database memory for a past-successful DB
 *   3. Try the highest-priority writable DB for the purpose
 *   4. On retryable error, failover to next writable DB
 *   5. On non-retryable error (auth, config), stop immediately
 *
 * Failover only happens for retryable errors (network, timeout, rate limit).
 * Auth and config errors are surfaced to the caller — they need human attention.
 */

import { getSanityClient, executeWithClient, type ClientResult } from "./client-factory";
import {
  getWritableDatabases,
  getDatabase,
  DEFAULT_DATABASE_KEY,
} from "./database-registry";
import { getPreferredDatabase, recordPreferredDatabase } from "./preferred-database";
import { recordDocumentLocation, removeDocumentLocation } from "./document-location-index";
import type { SanityDatabaseConfig, WriteResult, ErrorCategory } from "./types";
import type { SanityClient } from "@sanity/client";

// ─── Write Routing ─────────────────────────────────────────────

/**
 * Resolve which databases to attempt writes to, in order.
 * Returns an ordered list of database configs to try.
 */
export function resolveWriteOrder(
  purpose: string,
  hint?: string
): SanityDatabaseConfig[] {
  const ordered: SanityDatabaseConfig[] = [];
  const seen = new Set<string>();

  // 1. Explicit hint
  if (hint) {
    const db = getDatabase(hint);
    if (db && db.enabled && db.writable) {
      ordered.push(db);
      seen.add(db.key);
    }
  }

  // 2. Preferred database
  const preferredKey = getPreferredDatabase(purpose);
  if (preferredKey && !seen.has(preferredKey)) {
    const db = getDatabase(preferredKey);
    if (db && db.enabled && db.writable && db.purpose.includes(purpose)) {
      ordered.push(db);
      seen.add(db.key);
    }
  }

  // 3. All writable DBs for this purpose, sorted by priority
  const candidates = getWritableDatabases(purpose);
  for (const db of candidates) {
    if (!seen.has(db.key)) {
      ordered.push(db);
      seen.add(db.key);
    }
  }

  // 4. If no purpose-specific DB found, add default
  if (ordered.length === 0) {
    const fallback = getDatabase(DEFAULT_DATABASE_KEY);
    if (fallback && fallback.enabled && fallback.writable) {
      ordered.push(fallback);
    }
  }

  return ordered;
}

// ─── Write Operations ──────────────────────────────────────────

/**
 * Create a document with automatic failover.
 *
 * @param document - The document to create
 * @param purpose - Data category for routing
 * @param options - Additional options (databaseKey, documentId, maxAttempts)
 * @returns WriteResult with details about what happened
 */
export async function createDocument(
  document: Record<string, unknown>,
  purpose: string,
  options: {
    databaseKey?: string;
    documentId?: string;
    maxAttempts?: number;
  } = {}
): Promise<WriteResult> {
  const startTime = Date.now();
  const databases = resolveWriteOrder(purpose, options.databaseKey);
  const maxAttempts = options.maxAttempts ?? databases.length;

  let lastError: string | undefined;
  let lastErrorCategory: ErrorCategory | undefined;
  let attempts = 0;

  for (let i = 0; i < Math.min(maxAttempts, databases.length); i++) {
    const db = databases[i];
    attempts++;

    const result = await executeWithClient(db.key, async (client) => {
      return client.create(document as any, options.documentId ? { documentId: options.documentId } : undefined);
    });

    if (result.success) {
      // Success — record the location and preferred DB
      const created = result.data as Record<string, unknown>;
      if (created._id) {
        recordDocumentLocation(
          created._id as string,
          db.key,
          db.projectId,
          db.dataset,
          (created._type as string) || (document._type as string)
        );
      }
      recordPreferredDatabase(purpose, db.key);

      return {
        success: true,
        databaseKey: db.key,
        projectId: db.projectId,
        dataset: db.dataset,
        documentId: created._id as string | undefined,
        attempts,
        totalDurationMs: Date.now() - startTime,
      };
    }

    // Failure — check if we should failover
    lastError = result.error;
    lastErrorCategory = result.errorCategory;

    if (!result.isRetryable) {
      // Non-retryable — stop immediately
      break;
    }

    // Retryable — continue to next database
  }

  return {
    success: false,
    databaseKey: databases[Math.min(attempts - 1, databases.length - 1)]?.key || "unknown",
    projectId: databases[Math.min(attempts - 1, databases.length - 1)]?.projectId || "",
    dataset: databases[Math.min(attempts - 1, databases.length - 1)]?.dataset || "",
    attempts,
    totalDurationMs: Date.now() - startTime,
    error: lastError,
    errorCategory: lastErrorCategory,
  };
}

/**
 * Update (patch) a document with automatic failover.
 *
 * @param documentId - The document _id to update
 * @param patch - The patch operations to apply
 * @param purpose - Data category for routing
 * @param options - Additional options
 */
export async function updateDocument(
  documentId: string,
  patch: Record<string, unknown>,
  purpose: string,
  options: {
    databaseKey?: string;
    maxAttempts?: number;
  } = {}
): Promise<WriteResult> {
  const startTime = Date.now();
  const databases = resolveWriteOrder(purpose, options.databaseKey);
  const maxAttempts = options.maxAttempts ?? databases.length;

  let lastError: string | undefined;
  let lastErrorCategory: ErrorCategory | undefined;
  let attempts = 0;

  for (let i = 0; i < Math.min(maxAttempts, databases.length); i++) {
    const db = databases[i];
    attempts++;

    const result = await executeWithClient(db.key, async (client) => {
      return client.patch(documentId).set(patch).commit();
    });

    if (result.success) {
      recordDocumentLocation(documentId, db.key, db.projectId, db.dataset);
      recordPreferredDatabase(purpose, db.key);

      return {
        success: true,
        databaseKey: db.key,
        projectId: db.projectId,
        dataset: db.dataset,
        documentId,
        attempts,
        totalDurationMs: Date.now() - startTime,
      };
    }

    lastError = result.error;
    lastErrorCategory = result.errorCategory;

    if (!result.isRetryable) break;
  }

  return {
    success: false,
    databaseKey: databases[Math.min(attempts - 1, databases.length - 1)]?.key || "unknown",
    projectId: databases[Math.min(attempts - 1, databases.length - 1)]?.projectId || "",
    dataset: databases[Math.min(attempts - 1, databases.length - 1)]?.dataset || "",
    attempts,
    totalDurationMs: Date.now() - startTime,
    error: lastError,
    errorCategory: lastErrorCategory,
  };
}

/**
 * Delete a document with automatic failover.
 *
 * @param documentId - The document _id to delete
 * @param purpose - Data category for routing
 * @param options - Additional options
 */
export async function deleteDocument(
  documentId: string,
  purpose: string,
  options: {
    databaseKey?: string;
    maxAttempts?: number;
  } = {}
): Promise<WriteResult> {
  const startTime = Date.now();
  const databases = resolveWriteOrder(purpose, options.databaseKey);
  const maxAttempts = options.maxAttempts ?? databases.length;

  let lastError: string | undefined;
  let lastErrorCategory: ErrorCategory | undefined;
  let attempts = 0;

  for (let i = 0; i < Math.min(maxAttempts, databases.length); i++) {
    const db = databases[i];
    attempts++;

    const result = await executeWithClient(db.key, async (client) => {
      return client.delete(documentId);
    });

    if (result.success) {
      removeDocumentLocation(documentId);
      recordPreferredDatabase(purpose, db.key);

      return {
        success: true,
        databaseKey: db.key,
        projectId: db.projectId,
        dataset: db.dataset,
        documentId,
        attempts,
        totalDurationMs: Date.now() - startTime,
      };
    }

    lastError = result.error;
    lastErrorCategory = result.errorCategory;

    if (!result.isRetryable) break;
  }

  return {
    success: false,
    databaseKey: databases[Math.min(attempts - 1, databases.length - 1)]?.key || "unknown",
    projectId: databases[Math.min(attempts - 1, databases.length - 1)]?.projectId || "",
    dataset: databases[Math.min(attempts - 1, databases.length - 1)]?.dataset || "",
    attempts,
    totalDurationMs: Date.now() - startTime,
    error: lastError,
    errorCategory: lastErrorCategory,
  };
}

/**
 * Batch create multiple documents.
 * Each document gets its own failover cycle.
 */
export async function batchCreateDocuments(
  documents: Record<string, unknown>[],
  purpose: string,
  options: {
    databaseKey?: string;
  } = {}
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];

  for (const doc of documents) {
    const result = await createDocument(doc, purpose, {
      databaseKey: options.databaseKey,
    });
    results.push(result);
  }

  return results;
}

// ─── Legacy Compatibility ──────────────────────────────────────

/** @deprecated Use createDocument() instead */
export async function createDocumentInProject(
  document: Record<string, unknown>,
  purpose: string,
  options?: { databaseKey?: string; documentId?: string }
): Promise<WriteResult> {
  return createDocument(document, purpose, options);
}

/** @deprecated Use updateDocument() instead */
export async function updateDocumentInProject(
  documentId: string,
  patch: Record<string, unknown>,
  purpose: string,
  options?: { databaseKey?: string }
): Promise<WriteResult> {
  return updateDocument(documentId, patch, purpose, options);
}

/** @deprecated Use deleteDocument() instead */
export async function deleteDocumentInProject(
  documentId: string,
  purpose: string,
  options?: { databaseKey?: string }
): Promise<WriteResult> {
  return deleteDocument(documentId, purpose, options);
}
