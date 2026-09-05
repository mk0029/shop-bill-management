import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const serverToken = process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN || "";
const publicToken = process.env.NEXT_PUBLIC_SANITY_API_TOKEN || "";
const runtimeToken = typeof window === "undefined" ? serverToken : publicToken;
const hasToken = !!runtimeToken;
const effectivePerspective = hasToken ? "drafts" : "published";

// ─── Primary Write Guard ────────────────────────────────────────
// Bills, stock transactions, and bill items must NEVER be created in the
// primary Sanity dataset. The primary DB is read-only by policy; new records
// for these types go to the billing / inventory databases via the write
// router (or its server API routes). This guard is the final safety net so
// raw `sanityClient` calls can't spawn these doc types in primary.
const PRIMARY_BLOCKED_TYPES = new Set(["bill", "stockTransaction", "billItem"]);

function assertNotPrimaryBlocked(doc: unknown, origin: string): void {
  if (!doc || typeof doc !== "object") return;
  const type = (doc as Record<string, unknown>)._type;
  if (typeof type === "string" && PRIMARY_BLOCKED_TYPES.has(type)) {
    throw new Error(
      `[primary-write-guard] Blocked writing _type "${type}" to the primary dataset (via ${origin}). ` +
      `Bills/stock transactions must be routed to the billing/inventory databases instead.`
    );
  }
}

function createGuardedClient(raw: SanityClient): SanityClient {
  const guarded = new Proxy(raw, {
    get(target, prop, receiver) {
      if (prop === "create") {
        return (arg: unknown, options?: unknown) => {
          if (Array.isArray(arg)) {
            for (const doc of arg) assertNotPrimaryBlocked(doc, "sanityClient.create");
          } else {
            assertNotPrimaryBlocked(arg, "sanityClient.create");
          }
          return target.create(arg as never, options as never);
        };
      }
      if (prop === "createIfNotExists") {
        return (doc: unknown) => {
          assertNotPrimaryBlocked(doc, "sanityClient.createIfNotExists");
          return target.createIfNotExists(doc as never);
        };
      }
      if (prop === "createOrReplace") {
        return (doc: unknown) => {
          assertNotPrimaryBlocked(doc, "sanityClient.createOrReplace");
          return target.createOrReplace(doc as never);
        };
      }
      if (prop === "mutate") {
        return (mutations: unknown, options?: unknown) => {
          if (Array.isArray(mutations)) {
            for (const m of mutations) {
              for (const key of ["create", "createIfNotExists", "createOrReplace"]) {
                if (m && (m as Record<string, unknown>)[key]) {
                  assertNotPrimaryBlocked((m as Record<string, unknown>)[key], "sanityClient.mutate");
                }
              }
            }
          }
          return target.mutate(mutations as never, options as never);
        };
      }
      if (prop === "transaction") {
        return (arg?: unknown) => {
          if (Array.isArray(arg)) {
            for (const m of arg) {
              for (const key of ["create", "createIfNotExists", "createOrReplace"]) {
                if (m && (m as Record<string, unknown>)[key]) {
                  assertNotPrimaryBlocked((m as Record<string, unknown>)[key], "sanityClient.transaction");
                }
              }
            }
          }
          const builder = target.transaction(arg as never);
          return new Proxy(builder, {
            get(bTarget, bProp, bReceiver) {
              if (bProp === "create" || bProp === "createIfNotExists" || bProp === "createOrReplace") {
                return (doc: unknown) => {
                  assertNotPrimaryBlocked(doc, `sanityClient.transaction().${String(bProp)}`);
                  const fn = (bTarget as unknown as Record<string, (d: unknown) => unknown>)[bProp];
                  return fn.call(bTarget, doc);
                };
              }
              const value = Reflect.get(bTarget, bProp, bReceiver);
              return typeof value === "function" ? value.bind(bTarget) : value;
            },
          });
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return guarded;
}

const rawSanityClient: SanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: "2024-01-01",
  token: runtimeToken || undefined,
  ignoreBrowserTokenWarning: true,
  perspective: effectivePerspective,
});

export const sanityClient: SanityClient = createGuardedClient(rawSanityClient);

const builder = imageUrlBuilder(sanityClient);

export const urlFor = (source: SanityImageSource) => builder.image(source);

export const setupRealtimeListeners = (callback: (update: unknown) => void) => {
  const { role, user } = typeof window !== 'undefined' ?
    (window as any).__AUTH_STORE__?.getState() || { role: 'admin', user: null } :
    { role: 'admin', user: null };

  let query: string;
  let params: any = {};

  if (role === "customer") {
    query = '*[_type in ["bill", "user"]]';
  } else {
    query = '*[_type in ["user", "product", "bill", "stockTransaction", "brand", "category", "billMessage"]]';
  }

  const subscription = sanityClient
    .listen(query, params, { includeResult: true, visibility: 'query' })
    .subscribe((update) => callback(update as unknown));

  return subscription;
};

export const generateId = () =>
  window.btoa(Date.now().toString() + Math.random().toString());

export const queries = {
  brands: `*[_type == "brand" || _type == "brands"] { _id, _type, "name": select(defined(name) => name, defined(title) => title, "Unnamed Brand"), slug, logo, description, "isActive": select(defined(isActive) => isActive, true), "createdAt": select(defined(createdAt) => createdAt, _createdAt), "updatedAt": select(defined(updatedAt) => updatedAt, _updatedAt) }[defined(_id)] | order(name asc)`,
  categories: `*[_type == "category"] { _id, _type, name, slug, description, icon, parentCategory, "isActive": select(defined(isActive) => isActive, true), "sortOrder": select(defined(sortOrder) => sortOrder, 0), "createdAt": select(defined(createdAt) => createdAt, _createdAt), "updatedAt": select(defined(updatedAt) => updatedAt, _updatedAt) }[defined(_id)] | order(name asc)`,
  products: `*[_type == "product"] { ..., brand->{ _id, _type, "name": select(defined(name) => name, defined(title) => title, "Unnamed Brand"), slug, logo, description, "isActive": select(defined(isActive) => isActive, true) }, category->{ _id, _type, name, slug, description, icon, "isActive": select(defined(isActive) => isActive, true) } }[defined(_id)] | order(name asc)`,
  activeProducts: `*[_type == "product" && isActive == true] { ..., brand->{ _id, _type, "name": select(defined(name) => name, defined(title) => title, "Unnamed Brand"), slug, logo, description, "isActive": select(defined(isActive) => isActive, true) }, category->{ _id, _type, name, slug, description, icon, parentCategory->{ _id, name }, "isActive": select(defined(isActive) => isActive, true) } } | order(name asc)`,
  users: `*[_type == "user"] { _id, _type, clerkId, customerId, secretKey, name, nickname, email, phone, location, profileImage, "profileImageUrl": profileImage.asset->url, reminderLimit, dueReminderRepeatDays, reminderIntervalDays, preferredChannels, preferredReminderTime, allowDueReminder, lastDueReminderSentAt, lastDueReminderAmount, reminderCount, role, "isActive": select(defined(isActive) => isActive, true), "createdAt": select(defined(createdAt) => createdAt, _createdAt), "updatedAt": select(defined(updatedAt) => updatedAt, _updatedAt) }[defined(_id)] | order(name asc)`,
  customers: `*[_type == "user" && role == "customer"] { _id, _type, clerkId, customerId, secretKey, name, nickname, email, phone, location, reminderLimit, dueReminderRepeatDays, reminderIntervalDays, preferredChannels, preferredReminderTime, allowDueReminder, lastDueReminderSentAt, lastDueReminderAmount, reminderCount, role, "isActive": select(defined(isActive) => isActive, true), "createdAt": select(defined(createdAt) => createdAt, _createdAt), "updatedAt": select(defined(updatedAt) => updatedAt, _updatedAt) } | order(name asc)`,
  bills: `*[_type == "bill"] { _id, billId, billNumber, customer->{ _id, name, nickname, phone, email, location, role }, technician->{ _id, name, nickname, phone, email }, "items": items[]{ ..., "product": product->{ _id, _type, name, productName, description, specifications, "brand": brand->{name, _id}, "category": category->{name, _id} } }, serviceType, locationType, serviceDate, dueDate, visitingCharges, transportationFee, "repairFee": coalesce(repairFee, repairfee, 0), laborCharges, subtotal, taxAmount, "discount": coalesce(discount, discountAmount, 0), totalAmount, paymentStatus, paymentMethod, paidAmount, balanceAmount, status, priority, notes, internalNotes, createdAt, updatedAt } | order(createdAt desc)`,
  customerBills: (customerId: string) => `*[_type == "bill" && (customer._ref == "${customerId}" || customer == "${customerId}" || customer._id == "${customerId}" || customer->_id == "${customerId}" || customer->customerId == "${customerId}")] { _id, billId, billNumber, customer, customer->{ _id, customerId, name, phone, email, location, role }, technician->{ _id, name, nickname, phone, email }, "items": items[]{ ..., "product": product->{ _id, _type, name, productName, description, specifications, "brand": brand->{name, _id}, "category": category->{name, _id} } }, serviceType, locationType, dueDate, serviceDate, visitingCharges, transportationFee, "repairFee": coalesce(repairFee, repairfee, 0), laborCharges, subtotal, taxAmount, "discount": coalesce(discount, discountAmount, 0), totalAmount, paymentStatus, paymentMethod, paidAmount, balanceAmount, status, priority, notes, createdAt, updatedAt } | order(createdAt desc)`,
  stockTransactions: `*[_type == "stockTransaction"] { ..., product->{ _id, name, nickname, productId, pricing, inventory } } | order(transactionDate desc)`,
  testConnection: '*[_type match "*brand*"][0...3]',
  simpleBrands: '*[_type == "brand" || _type == "brands"][0...5]',
  simpleCategories: '*[_type == "category"][0...5]',
  simpleProducts: '*[_type == "product"][0...5]',
  documentTypes: "*[]._type",
  whatsappConfigs: `*[_type == "whatsappConfig" && isActive == true] | order(priority asc) { _id, configName, isActive, businessInfo, devices, messageTemplate, loadBalancing, analytics, createdAt, updatedAt }`,
  whatsappConfig: (configId: string) => `*[_type == "whatsappConfig" && _id == "${configId}"][0] { _id, configName, isActive, businessInfo, devices, messageTemplate, loadBalancing, analytics, createdAt, updatedAt }`,
};

// ─── Multi-Database Architecture Re-exports ────────────────────

export {
  // Types — Phase 2
  type SanityDatabaseConfig,
  type DatabaseRole,
  type DatabaseHealthStatus,
  type DatabaseHealthEntry,
  type ErrorCategory,
  type WriteResult,
  type ReadOptions,
  type WriteOptions,
  type UnifiedDocument,
  type SanityOperationLog,
  type PreferredDatabaseEntry,
  type DocumentLocationEntry,
  // Aggregation types
  type AggregationPhase,
  type DatabaseFetchResult,
  type AggregatedResult,
  type AggregationProgress,
  type AggregationProgressCallback,
  type AggregationOptions,
  // Legacy aliases
  type SanityProjectConfig,
  type SanityClientEntry,
  type ProjectHealthStatus,
  type DocumentTarget,
  type CreateDocumentOptions,
  type UpdateDocumentOptions,
  type DeleteDocumentOptions,
} from "./sanity/types";

export {
  // Database Registry
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
} from "./sanity/database-registry";

export {
  // Client Factory
  getSanityClient,
  createClientFromConfig,
  getReadOnlyClient,
  evictClient,
  evictAllClients,
  getCachedKeys,
  executeWithClient,
  type ClientResult,
} from "./sanity/client-factory";

export {
  // Error Classifier
  classifyError,
  isRetryable,
  describeErrorCategory,
} from "./sanity/error-classifier";

export {
  // Aggregation Engine
  aggregateDocuments,
  aggregateDocumentsSimple,
  aggregateWithState,
} from "./sanity/aggregation-engine";

export {
  // Read Router
  resolveReadDatabase,
  getReadClient,
  getDocument,
  getDocumentsByIds,
  queryDocuments as queryDocumentsFromDB,
  querySingleDocument,
  searchDocuments,
  countDocuments,
  aggregateRead,
  aggregateReadSimple,
  readAcrossDatabases,
  recordReadSuccess,
} from "./sanity/read-router";

export {
  // Write Router
  resolveWriteOrder,
  createDocument as createDocumentDB,
  updateDocument as updateDocumentDB,
  deleteDocument as deleteDocumentDB,
  batchCreateDocuments as batchCreateDocumentsDB,
  createDocumentInProject,
  updateDocumentInProject,
  deleteDocumentInProject,
} from "./sanity/write-router";

export {
  // Document Location Index
  recordDocumentLocation,
  recordFromUnified,
  lookupDocumentLocation,
  getDocumentsInDatabase,
  getDocumentsByType,
  removeDocumentLocation,
  clearLocationIndex,
  getLocationIndexSize,
  getAllLocationsGrouped,
} from "./sanity/document-location-index";

export {
  // Preferred Database Memory
  recordPreferredDatabase,
  getPreferredDatabase,
  clearPreferredDatabase,
  clearAllPreferredDatabases,
  getAllPreferredDatabases,
} from "./sanity/preferred-database";

export {
  // Unified Documents
  toUnifiedDocument,
  toUnifiedDocuments,
  toUnifiedDocumentMeta,
} from "./sanity/unified-document";

export {
  // Database Health
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
} from "./sanity/database-health";

export {
  // Legacy Document Router
  queryAllProjects,
  selectProjectForNewDocument,
} from "./sanity/document-router";
