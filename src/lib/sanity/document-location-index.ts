/**
 * Document Location Index — Lightweight in-memory mapping of document IDs
 * to the database they live in.
 *
 * This avoids scanning all databases when you know a specific document ID.
 * The index is populated lazily as documents are fetched, and can be
 * pre-seeded from API responses or user navigation.
 *
 * This index is IN-MEMORY only (not persisted to localStorage) because
 * document locations can change when admin migrates data.
 */

import type { DocumentLocationEntry } from "./types";

// ─── In-Memory Index ───────────────────────────────────────────

const locationIndex = new Map<string, DocumentLocationEntry>();
const MAX_ENTRIES = 50_000;

// ─── Core API ──────────────────────────────────────────────────

/**
 * Record where a document lives.
 * Called automatically after successful fetches/creates.
 */
export function recordDocumentLocation(
  documentId: string,
  databaseKey: string,
  projectId: string,
  dataset: string,
  documentType?: string
): void {
  // Evict oldest if we're at capacity
  if (locationIndex.size >= MAX_ENTRIES) {
    evictOldest(1000);
  }

  locationIndex.set(documentId, {
    documentId,
    databaseKey,
    projectId,
    dataset,
    documentType,
    indexedAt: Date.now(),
  });
}

/**
 * Record a document location from a UnifiedDocument.
 */
export function recordFromUnified(doc: {
  id: string;
  databaseKey: string;
  projectId: string;
  dataset: string;
  type?: string;
}): void {
  recordDocumentLocation(doc.id, doc.databaseKey, doc.projectId, doc.dataset, doc.type);
}

/**
 * Look up which database a document ID lives in.
 * Returns undefined if the document hasn't been seen before.
 */
export function lookupDocumentLocation(documentId: string): DocumentLocationEntry | undefined {
  return locationIndex.get(documentId);
}

/**
 * Get all documents that are known to live in a specific database.
 */
export function getDocumentsInDatabase(databaseKey: string): DocumentLocationEntry[] {
  const results: DocumentLocationEntry[] = [];
  for (const entry of locationIndex.values()) {
    if (entry.databaseKey === databaseKey) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Get all entries for a specific document type across all databases.
 */
export function getDocumentsByType(documentType: string): DocumentLocationEntry[] {
  const results: DocumentLocationEntry[] = [];
  for (const entry of locationIndex.values()) {
    if (entry.documentType === documentType) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Remove a document from the index (e.g. after deletion).
 */
export function removeDocumentLocation(documentId: string): void {
  locationIndex.delete(documentId);
}

/**
 * Clear the entire index.
 */
export function clearLocationIndex(): void {
  locationIndex.clear();
}

/**
 * Get total number of indexed documents.
 */
export function getLocationIndexSize(): number {
  return locationIndex.size;
}

/**
 * Get the location of all documents, grouped by database key.
 * Useful for admin/debugging views.
 */
export function getAllLocationsGrouped(): Record<string, DocumentLocationEntry[]> {
  const grouped: Record<string, DocumentLocationEntry[]> = {};
  for (const entry of locationIndex.values()) {
    if (!grouped[entry.databaseKey]) {
      grouped[entry.databaseKey] = [];
    }
    grouped[entry.databaseKey].push(entry);
  }
  return grouped;
}

// ─── Helpers ───────────────────────────────────────────────────

function evictOldest(count: number): void {
  // Sort by indexedAt ascending, remove the oldest `count` entries
  const entries = Array.from(locationIndex.entries())
    .sort((a, b) => a[1].indexedAt - b[1].indexedAt);

  for (let i = 0; i < Math.min(count, entries.length); i++) {
    locationIndex.delete(entries[i][0]);
  }
}
