/**
 * Sanity Multi-Database Architecture — Barrel Export
 *
 * Import from this module for all multi-database Sanity operations.
 */

// ─── Types ─────────────────────────────────────────────────────
export type {
  // Phase 2 types
  SanityDatabaseConfig,
  DatabaseRole,
  DatabaseHealthStatus,
  DatabaseHealthEntry,
  ErrorCategory,
  WriteResult,
  ReadOptions,
  WriteOptions,
  UnifiedDocument,
  SanityOperationLog,
  PreferredDatabaseEntry,
  DocumentLocationEntry,
  // Aggregation types
  AggregationPhase,
  DatabaseFetchResult,
  AggregatedResult,
  AggregationProgress,
  AggregationProgressCallback,
  AggregationOptions,
  // Legacy aliases
  SanityProjectConfig,
  SanityClientEntry,
  ProjectHealthStatus,
  DocumentTarget,
  CreateDocumentOptions,
  UpdateDocumentOptions,
  DeleteDocumentOptions,
} from "./types";

export { RETRYABLE_ERRORS, NON_RETRYABLE_ERRORS } from "./types";

// ─── Database Registry ─────────────────────────────────────────
export {
  getDatabaseList,
  refreshDatabaseList,
  getDatabase,
  getDatabasesByRole,
  getDatabasesForPurpose,
  getWritableDatabases,
  getReadableDatabases,
  getDatabasesByViewPriority,
  getViewDatabase,
  getBackgroundDatabases,
  getAllEnabledDatabases,
  getAllWritableDatabases,
  getDatabaseToken,
  isDatabaseEnabled,
  getDatabaseCount,
  DEFAULT_DATABASE_KEY,
  DEFAULT_API_VERSION,
  KNOWN_ROLES,
  // Legacy
  getEnabledSanityProjects,
  getSanityProject,
  getAllSanityProjects,
  isProjectEnabled,
  isProjectValid,
  getProjectList,
  refreshProjectList,
  getProjectToken,
  DEFAULT_PROJECT_KEY,
} from "./database-registry";

// ─── Client Factory ────────────────────────────────────────────
export {
  getSanityClient,
  createClientFromConfig,
  getReadOnlyClient,
  evictClient,
  evictAllClients,
  getCachedKeys,
  executeWithClient,
  type ClientResult,
} from "./client-factory";

// ─── Error Classifier ──────────────────────────────────────────
export {
  classifyError,
  isRetryable,
  describeErrorCategory,
} from "./error-classifier";

// ─── Aggregation Engine ────────────────────────────────────────
export {
  aggregateDocuments,
  aggregateDocumentsSimple,
  aggregateWithState,
} from "./aggregation-engine";

// ─── Read Router ───────────────────────────────────────────────
export {
  resolveReadDatabase,
  getReadClient,
  getDocument,
  getDocumentsByIds,
  queryDocuments,
  querySingleDocument,
  searchDocuments,
  countDocuments,
  aggregateRead,
  aggregateReadSimple,
  readAcrossDatabases,
  recordReadSuccess,
} from "./read-router";

// ─── Write Router ──────────────────────────────────────────────
export {
  resolveWriteOrder,
  createDocument,
  updateDocument,
  deleteDocument,
  batchCreateDocuments,
  createDocumentInProject,
  updateDocumentInProject,
  deleteDocumentInProject,
} from "./write-router";

// ─── Document Location Index ───────────────────────────────────
export {
  recordDocumentLocation,
  recordFromUnified,
  lookupDocumentLocation,
  getDocumentsInDatabase,
  getDocumentsByType,
  removeDocumentLocation,
  clearLocationIndex,
  getLocationIndexSize,
  getAllLocationsGrouped,
} from "./document-location-index";

// ─── Preferred Database Memory ─────────────────────────────────
export {
  recordPreferredDatabase,
  getPreferredDatabase,
  clearPreferredDatabase,
  clearAllPreferredDatabases,
  getAllPreferredDatabases,
} from "./preferred-database";

// ─── Unified Documents ─────────────────────────────────────────
export {
  toUnifiedDocument,
  toUnifiedDocuments,
  toUnifiedDocumentMeta,
} from "./unified-document";

// ─── Database Health ───────────────────────────────────────────
export {
  getDatabaseStatus,
  getAllDatabaseStatuses,
  getDatabasesHealthSummary,
  getDatabaseDocumentTypeCounts,
  getDatabaseStatusByRole,
  isDatabaseHealthyAndWritable,
  getProjectStatus,
  getAllProjectStatuses,
  getProjectsHealthSummary,
  getProjectDocumentTypeCounts,
} from "./database-health";

// ─── Legacy Re-exports ─────────────────────────────────────────
export {
  queryAllProjects,
  selectProjectForNewDocument,
} from "./document-router";
