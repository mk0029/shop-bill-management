import type { SanityClient } from "@sanity/client";

// ─── Database Roles ────────────────────────────────────────────
// Each Sanity project is registered with a role that determines
// what kind of data it stores and how it participates in routing.
// Multiple databases can share the same role.

export type DatabaseRole =
  | "primary"
  | "inventory"
  | "billing"
  | "public"
  | "archive"
  | "analytics"
  | "customers"
  | "documents"
  | "logs"
  | "overflow"
  | string; // extensible for custom roles

// ─── Database Configuration ────────────────────────────────────
// The central config type. Every Sanity project (database) in the
// system is described by this shape.
//
// MULTIPLE DBs PER ROLE:
//   Multiple databases can share the same `role`. For example,
//   you might have 3 "inventory" databases:
//     - inventory-us (viewPriority: 1, fast CDN)
//     - inventory-eu (viewPriority: 2, regional)
//     - inventory-backup (viewPriority: 3, archive)
//
// VIEW PRIORITY:
//   `viewPriority` controls which database is used for FIRST LOAD.
//   Lower number = faster initial load. The aggregation engine
//   fetches from the view DB first, then loads remaining DBs in
//   the background.

export interface SanityDatabaseConfig {
  /** Unique application-level key (e.g. "inventory-us", "inventory-eu") */
  key: string;
  /** Sanity projectId (hex string from sanity.io dashboard) */
  projectId: string;
  /** Sanity dataset name */
  dataset: string;
  /** Role determines what data category this DB serves.
   *  Multiple DBs can share the same role. */
  role: DatabaseRole;
  /** Freeform purposes for fine-grained routing (e.g. ["bills", "transactions"]) */
  purpose: string[];
  /** Whether this database is active */
  enabled: boolean;
  /** Whether this database accepts reads */
  readable: boolean;
  /** Whether this database accepts writes */
  writable: boolean;
  /** Lower number = higher priority for write routing */
  priority: number;
  /** Lower number = faster first load. Used by aggregation engine
   *  to decide which DB to fetch from first. DBs with viewPriority=1
   *  are loaded immediately; others load in background. */
  viewPriority: number;
  /** Human-readable label for UI/admin */
  label: string;
  /** Maximum document capacity (optional, for capacity-based routing) */
  maxDocuments?: number;
  /** Safety threshold — when doc count exceeds this, route new writes elsewhere */
  safetyThreshold?: number;
  /** API version override (defaults to "2024-01-01") */
  apiVersion?: string;
  /** Whether to use CDN for reads */
  useCdn?: boolean;
  /** Region hint for latency-aware routing (e.g. "us", "eu", "asia") */
  region?: string;
}

// ─── Aggregation Types ─────────────────────────────────────────
// Types for the 2-phase loading engine.

/**
 * Phase of data loading.
 * - "initial": Loading from view database (fast, first paint)
 * - "syncing": Loading from remaining databases (background)
 * - "complete": All databases loaded
 */
export type AggregationPhase = "initial" | "syncing" | "complete";

/**
 * Result from a single database during aggregation.
 */
export interface DatabaseFetchResult {
  databaseKey: string;
  role: DatabaseRole;
  documents: UnifiedDocument[];
  success: boolean;
  error?: string;
  durationMs: number;
  documentCount: number;
}

/**
 * Aggregated result with all documents merged from all databases.
 */
export interface AggregatedResult<T = UnifiedDocument> {
  /** All documents merged, deduplicated, and sorted */
  documents: T[];
  /** Current phase of loading */
  phase: AggregationPhase;
  /** Results from each individual database */
  databaseResults: DatabaseFetchResult[];
  /** Total documents across all DBs */
  totalDocuments: number;
  /** How many DBs were successfully queried */
  successfulDatabases: number;
  /** Total databases that were queried */
  totalDatabases: number;
  /** Total time for the aggregation */
  totalDurationMs: number;
  /** Whether all DBs loaded successfully */
  allSucceeded: boolean;
  /** Documents from the view database (fastest load) */
  viewDocuments: T[];
  /** Documents from non-view databases (loaded in background) */
  backgroundDocuments: T[];
}

/**
 * Progress callback for aggregation loading.
 * Called as each database completes loading.
 */
export interface AggregationProgress {
  phase: AggregationPhase;
  loadedDatabases: number;
  totalDatabases: number;
  latestDatabase: string;
  documentsSoFar: number;
}

export type AggregationProgressCallback = (progress: AggregationProgress) => void;

/**
 * Options for aggregation queries.
 */
export interface AggregationOptions {
  /** The purpose/category of data being read */
  purpose: string;
  /** GROQ query to run against each database */
  groqQuery: string;
  /** Query parameters */
  params?: Record<string, unknown>;
  /** Force specific database keys (skips view priority) */
  databaseKeys?: string[];
  /** Maximum time to wait for initial view DB load (ms) */
  initialTimeoutMs?: number;
  /** Maximum time to wait for all DBs (ms) */
  totalTimeoutMs?: number;
  /** Progress callback for UI updates */
  onProgress?: AggregationProgressCallback;
  /** Whether to deduplicate documents across DBs */
  deduplicate?: boolean;
  /** How to merge duplicate documents (default: "newest") */
  mergeStrategy?: "newest" | "view-db" | "all";
  /** Custom sort function for final results */
  sortFn?: (a: UnifiedDocument, b: UnifiedDocument) => number;
  /** Filter function to exclude documents */
  filterFn?: (doc: UnifiedDocument) => boolean;
}

// ─── Error Classification ──────────────────────────────────────
// Errors are classified to decide whether to failover or alert.

export type ErrorCategory =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "CONFIG_ERROR"
  | "NOT_FOUND"
  | "PROJECT_DISABLED"
  | "INVALID_INPUT"
  | "SANITY_API_ERROR"
  | "UNKNOWN";

/**
 * Whether an error category is safe to retry/failover on.
 * AUTH_ERROR and CONFIG_ERROR should NOT trigger failover — they need human attention.
 */
export const RETRYABLE_ERRORS: ErrorCategory[] = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "RATE_LIMIT",
  "SANITY_API_ERROR",
  "UNKNOWN",
];

export const NON_RETRYABLE_ERRORS: ErrorCategory[] = [
  "AUTH_ERROR",
  "CONFIG_ERROR",
  "PROJECT_DISABLED",
];

// ─── Write Result ──────────────────────────────────────────────

export interface WriteResult {
  success: boolean;
  /** The database key that was actually used */
  databaseKey: string;
  projectId: string;
  dataset: string;
  documentId?: string;
  /** Number of attempts (including failovers) */
  attempts: number;
  /** Total duration across all attempts */
  totalDurationMs: number;
  /** If all attempts failed, the last error */
  error?: string;
  errorCategory?: ErrorCategory;
}

// ─── Read Options ──────────────────────────────────────────────

export interface ReadOptions {
  /** The purpose/category of data being read (e.g. "inventory", "bills") */
  purpose: string;
  /** Optional: force reading from a specific database key */
  databaseKey?: string;
}

export interface ReadByDatabaseOptions {
  /** Specific database key to read from */
  databaseKey: string;
}

// ─── Write Options ─────────────────────────────────────────────

export interface WriteOptions {
  /** The purpose/category of data being written (e.g. "inventory", "bills") */
  purpose: string;
  /** The document to create/update */
  document: Record<string, unknown>;
  /** Optional: force writing to a specific database key */
  databaseKey?: string;
  /** Optional: deterministic document ID for idempotent writes */
  documentId?: string;
  /** Optional: max number of failover attempts (default: all writable DBs) */
  maxAttempts?: number;
}

export interface WriteToDatabaseOptions {
  /** Specific database key to write to */
  databaseKey: string;
  document: Record<string, unknown>;
  documentId?: string;
}

// ─── Database Health ───────────────────────────────────────────

export type DatabaseHealthStatus = "healthy" | "degraded" | "unreachable" | "disabled";

export interface DatabaseHealthEntry {
  key: string;
  role: DatabaseRole;
  label: string;
  status: DatabaseHealthStatus;
  readable: boolean;
  writable: boolean;
  enabled: boolean;
  documentCount: number | null;
  maxDocuments: number | null;
  error?: string;
  lastChecked: string;
  latencyMs?: number;
}

// ─── Preferred Database Memory ─────────────────────────────────

export interface PreferredDatabaseEntry {
  purpose: string;
  databaseKey: string;
  updatedAt: number;
  version: number;
}

// ─── Document Location Index Entry ─────────────────────────────

export interface DocumentLocationEntry {
  documentId: string;
  databaseKey: string;
  projectId: string;
  dataset: string;
  documentType?: string;
  indexedAt: number;
}

// ─── Structured Operation Log ──────────────────────────────────

export interface SanityOperationLog {
  databaseKey: string;
  purpose?: string;
  operation: "fetch" | "create" | "update" | "delete" | "listen" | "health-check" | "failover";
  documentId?: string;
  success: boolean;
  durationMs: number;
  attempt?: number;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
}

// ─── Unified Document ──────────────────────────────────────────
// Every document returned by the multi-project layer includes
// enough metadata to identify which database it came from.

export interface UnifiedDocument {
  /** Sanity document _id */
  id: string;
  /** Application-level database key (e.g. "primary", "inventory") */
  databaseKey: string;
  /** Sanity projectId */
  projectId: string;
  /** Sanity dataset */
  dataset: string;
  /** Sanity document _type */
  type: string;
  /** Human-readable title (resolved per schema) */
  title?: string;
  /** Slug (resolved per schema) */
  slug?: string;
  /** Document creation timestamp */
  createdAt?: string;
  /** Document last-update timestamp */
  updatedAt?: string;
  /** The full Sanity document data */
  data: Record<string, unknown>;
  /** Sanity _rev for optimistic concurrency */
  revision?: string;
}

// ─── Legacy Compatibility Types ────────────────────────────────
// These allow existing code that used "projectKey" terminology
// to continue working. They map 1:1 to the new types.

/** @deprecated Use SanityDatabaseConfig instead */
export type SanityProjectConfig = SanityDatabaseConfig;

/** @deprecated Use DatabaseHealthEntry instead */
export type ProjectHealthStatus = DatabaseHealthEntry & {
  projectKey: string;
  configuredLimit: number | null;
  remainingCapacity: number | null;
};

/** @deprecated Use ReadOptions.databaseKey instead */
export interface DocumentTarget {
  projectKey: string;
  documentId: string;
}

/** @deprecated Use WriteOptions instead */
export interface CreateDocumentOptions {
  projectKey?: string;
  purpose?: string;
  document: Record<string, unknown>;
  routingStrategy?: "priority" | "round-robin" | "least-full" | "manual";
}

/** @deprecated Use WriteToDatabaseOptions instead */
export interface UpdateDocumentOptions {
  projectKey: string;
  documentId: string;
  patch: Record<string, unknown>;
}

/** @deprecated Use WriteToDatabaseOptions instead */
export interface DeleteDocumentOptions {
  projectKey: string;
  documentId: string;
}

export interface SanityClientEntry {
  config: SanityDatabaseConfig;
  client: SanityClient;
}
