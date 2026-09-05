/**
 * Preferred Database — Browser-local memory that remembers which DB worked
 * for a given purpose. On next visit, reads target that DB first.
 *
 * This is a localStorage-based cache. It NEVER stores any Sanity tokens,
 * project IDs, or any sensitive data — only the application-level database key
 * and the purpose string.
 *
 * Storage format in localStorage:
 *   Key:   "preferred_databases"
 *   Value: { "<purpose>": { databaseKey, updatedAt, version }, ... }
 */

import type { PreferredDatabaseEntry } from "./types";

const STORAGE_KEY = "preferred_databases";
const STORAGE_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Core API ──────────────────────────────────────────────────

/**
 * Record that a specific database handled a purpose successfully.
 * Called after a successful read or write to "remember" the choice.
 */
export function recordPreferredDatabase(purpose: string, databaseKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = readStorage();
    map[purpose] = {
      purpose,
      databaseKey,
      updatedAt: Date.now(),
      version: STORAGE_VERSION,
    };
    writeStorage(map);
  } catch {
    // localStorage might be full or unavailable — silently fail
  }
}

/**
 * Get the previously preferred database for a purpose.
 * Returns undefined if no preference is stored, or if it's expired.
 */
export function getPreferredDatabase(purpose: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const map = readStorage();
    const entry = map[purpose];
    if (!entry) return undefined;
    if (Date.now() - entry.updatedAt > TTL_MS) {
      // Expired — clean up
      delete map[purpose];
      writeStorage(map);
      return undefined;
    }
    return entry.databaseKey;
  } catch {
    return undefined;
  }
}

/**
 * Clear the preferred database for a specific purpose.
 */
export function clearPreferredDatabase(purpose: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = readStorage();
    delete map[purpose];
    writeStorage(map);
  } catch {
    // silently fail
  }
}

/**
 * Clear all preferred databases.
 */
export function clearAllPreferredDatabases(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}

/**
 * Get all stored preferred databases (for debugging/admin UIs).
 */
export function getAllPreferredDatabases(): PreferredDatabaseEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const map = readStorage();
    const now = Date.now();
    return Object.values(map).filter((e) => now - e.updatedAt <= TTL_MS);
  } catch {
    return [];
  }
}

// ─── Storage Helpers ───────────────────────────────────────────

function readStorage(): Record<string, PreferredDatabaseEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStorage(map: Record<string, PreferredDatabaseEntry>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage might be full — ignore
  }
}
