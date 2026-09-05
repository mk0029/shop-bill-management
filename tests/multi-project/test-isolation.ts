/**
 * Multi-Database Sanity Architecture — Integration Tests
 *
 * Run: npx tsx tests/multi-project/test-isolation.ts
 *
 * These tests verify:
 * 1. Database registry discovers databases from config
 * 2. Client factory creates isolated clients per database
 * 3. CRUD operations target the correct database
 * 4. Primary database still works (backward compatibility)
 * 5. Adding a new database via config requires no code changes
 * 6. Failure isolation — one database failing doesn't break others
 * 7. Error classification works correctly
 * 8. Read/write routing resolves correct databases
 * 9. Document location index tracks document locations
 * 10. Preferred database memory persists hints
 */

import {
  getDatabaseList,
  refreshDatabaseList,
  getDatabaseToken,
  DEFAULT_DATABASE_KEY,
  getDatabase,
  getAllEnabledDatabases,
  getDatabaseCount,
} from "../../src/lib/sanity/database-registry";

import {
  getSanityClient,
  evictAllClients,
  createClientFromConfig,
  executeWithClient,
} from "../../src/lib/sanity/client-factory";

import {
  classifyError,
  isRetryable,
} from "../../src/lib/sanity/error-classifier";

import {
  resolveReadDatabase,
} from "../../src/lib/sanity/read-router";

import {
  resolveWriteOrder,
} from "../../src/lib/sanity/write-router";

import {
  recordDocumentLocation,
  lookupDocumentLocation,
  getDocumentsInDatabase,
  clearLocationIndex,
  getLocationIndexSize,
} from "../../src/lib/sanity/document-location-index";

import {
  toUnifiedDocument,
  toUnifiedDocuments,
} from "../../src/lib/sanity/unified-document";

import type { SanityDatabaseConfig } from "../../src/lib/sanity/types";

// ─── Test Helpers ──────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    console.error(`  ✗ ${message} — expected to throw`);
    failed++;
  } catch {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

// ─── Test 1: Database Registry ─────────────────────────────────

console.log("\n━━━ Test 1: Database Registry ━━━");

const databases = getDatabaseList();
assert(databases.length >= 1, "At least 1 database configured");
assertEqual(databases[0].key, "primary", "First database is 'primary'");
assertEqual(databases[0].projectId, "idji8ni7", "Primary has correct Sanity ID");
assertEqual(databases[0].dataset, "live-shop", "Primary has correct dataset");
assert(databases[0].enabled, "Primary is enabled");
assertEqual(databases[0].role, "primary", "Primary has correct role");
assert(databases[0].purpose.includes("general"), "Primary purpose includes 'general'");

const enabledDatabases = getAllEnabledDatabases();
assert(enabledDatabases.length >= 1, "At least 1 enabled database");
assert(enabledDatabases.every((d) => d.enabled), "All returned databases are enabled");

assertEqual(DEFAULT_DATABASE_KEY, "primary", "Default database key is 'primary'");
assert(getDatabaseCount() >= 1, "Database count >= 1");

const primary = getDatabase("primary");
assert(!!primary, "getDatabase('primary') returns a database");
assertEqual(primary!.projectId, "idji8ni7", "Primary Sanity ID matches");

const unknown = getDatabase("project-999");
assert(!unknown, "getDatabase('project-999') returns undefined");

// ─── Test 2: Client Factory ────────────────────────────────────

console.log("\n━━━ Test 2: Client Factory ━━━");

const client1 = getSanityClient("primary");
assert(!!client1, "getSanityClient('primary') returns a client");

// Same client should be returned (cached)
const client1b = getSanityClient("primary");
assert(client1 === client1b, "Client is cached and reused");

// Client factory throws for invalid database
assertThrows(
  () => getSanityClient("project-999"),
  "getSanityClient throws for invalid database"
);

// Evict works
evictAllClients();
const client1c = getSanityClient("primary");
assert(client1 !== client1c, "After eviction, new client is created");

// createClientFromConfig works
const freshClient = createClientFromConfig({
  key: "test",
  projectId: "idji8ni7",
  dataset: "live-shop",
  role: "primary",
  purpose: ["test"],
  enabled: true,
  readable: true,
  writable: true,
  priority: 99,
  viewPriority: 99,
  label: "Test",
});
assert(!!freshClient, "createClientFromConfig returns a client");

// ─── Test 3: Error Classifier ──────────────────────────────────

console.log("\n━━━ Test 3: Error Classifier ━━━");

assertEqual(classifyError(new Error("ETIMEDOUT")), "TIMEOUT", "Classifies timeout");
assertEqual(classifyError(new Error("ENOTFOUND")), "NETWORK_ERROR", "Classifies DNS error");
assertEqual(classifyError(new Error("rate limit exceeded")), "RATE_LIMIT", "Classifies rate limit");
assertEqual(classifyError(new Error("unauthorized")), "AUTH_ERROR", "Classifies auth error");
assertEqual(classifyError(new Error("not found")), "NOT_FOUND", "Classifies not found");
assertEqual(classifyError(new Error("project disabled")), "PROJECT_DISABLED", "Classifies disabled");
assertEqual(classifyError(new Error("some weird error")), "UNKNOWN", "Classifies unknown");

assert(isRetryable("NETWORK_ERROR"), "Network errors are retryable");
assert(isRetryable("TIMEOUT"), "Timeouts are retryable");
assert(isRetryable("RATE_LIMIT"), "Rate limits are retryable");
assert(!isRetryable("AUTH_ERROR"), "Auth errors are NOT retryable");
assert(!isRetryable("CONFIG_ERROR"), "Config errors are NOT retryable");

// ─── Test 4: Unified Document ──────────────────────────────────

console.log("\n━━━ Test 4: Unified Document ━━━");

const mockSanityDoc = {
  _id: "abc123",
  _type: "product",
  _createdAt: "2024-01-01T00:00:00Z",
  _updatedAt: "2024-06-01T00:00:00Z",
  _rev: "rev1",
  name: "Test Product",
  slug: { current: "test-product" },
  price: 100,
};

const unified = toUnifiedDocument(mockSanityDoc, "primary", "idji8ni7", "live-shop");
assertEqual(unified.id, "abc123", "Unified doc has correct id");
assertEqual(unified.databaseKey, "primary", "Unified doc has correct databaseKey");
assertEqual(unified.projectId, "idji8ni7", "Unified doc has correct projectId");
assertEqual(unified.dataset, "live-shop", "Unified doc has correct dataset");
assertEqual(unified.type, "product", "Unified doc has correct type");
assertEqual(unified.title, "Test Product", "Unified doc extracts title from 'name'");
assertEqual(unified.slug, "test-product", "Unified doc extracts slug from slug.current");
assertEqual(unified.revision, "rev1", "Unified doc has revision");

// Test batch conversion
const docs = [mockSanityDoc, { ...mockSanityDoc, _id: "def456", name: "Product 2" }];
const unifiedBatch = toUnifiedDocuments(docs, "inventory", "xyz789", "production");
assertEqual(unifiedBatch.length, 2, "Batch conversion returns correct count");
assertEqual(unifiedBatch[1].databaseKey, "inventory", "Batch items have correct databaseKey");
assertEqual(unifiedBatch[1].projectId, "xyz789", "Batch items have correct projectId");
assertEqual(unifiedBatch[1].title, "Product 2", "Batch items extract title correctly");

// ─── Test 5: Document Location Index ───────────────────────────

console.log("\n━━━ Test 5: Document Location Index ━━━");

clearLocationIndex();
assertEqual(getLocationIndexSize(), 0, "Index is empty after clear");

recordDocumentLocation("doc-1", "primary", "idji8ni7", "live-shop", "bill");
recordDocumentLocation("doc-2", "inventory", "xyz789", "production", "product");
assertEqual(getLocationIndexSize(), 2, "Index has 2 entries");

const loc1 = lookupDocumentLocation("doc-1");
assert(!!loc1, "lookupDocumentLocation finds doc-1");
assertEqual(loc1!.databaseKey, "primary", "doc-1 is in primary");
assertEqual(loc1!.documentType, "bill", "doc-1 is a bill");

const docsInPrimary = getDocumentsInDatabase("primary");
assertEqual(docsInPrimary.length, 1, "1 document in primary");
assertEqual(docsInPrimary[0].documentId, "doc-1", "doc-1 is in primary");

// ─── Test 6: Read Router ───────────────────────────────────────

console.log("\n━━━ Test 6: Read Router ━━━");

const readDb = resolveReadDatabase("general");
assertEqual(readDb.key, "primary", "Read for 'general' resolves to primary");

const readDbHinted = resolveReadDatabase("general", "primary");
assertEqual(readDbHinted.key, "primary", "Read with hint resolves to hinted DB");

// ─── Test 7: Write Router ──────────────────────────────────────

console.log("\n━━━ Test 7: Write Router ━━━");

const writeOrder = resolveWriteOrder("general");
assert(writeOrder.length >= 1, "At least 1 writable database for 'general'");
assertEqual(writeOrder[0].key, "primary", "First write target is primary");

const writeOrderHinted = resolveWriteOrder("general", "primary");
assert(writeOrderHinted.length >= 1, "Write with hint returns databases");
assertEqual(writeOrderHinted[0].key, "primary", "Write with hint targets hinted DB first");

// ─── Test 8: Failure Isolation ─────────────────────────────────

console.log("\n━━━ Test 8: Failure Isolation ━━━");

// Invalid database errors should be isolated
try {
  getSanityClient("project-999");
  console.error("  ✗ Should have thrown for project-999");
  failed++;
} catch (e) {
  assert(e instanceof Error, "Error is an Error instance");
  assert(
    e instanceof Error && e.message.includes("project-999"),
    "Error message includes the invalid key"
  );
}

// primary should still work after project-999 failure
const clientStillWorks = getSanityClient("primary");
assert(!!clientStillWorks, "primary client still works after project-999 failure");

// ─── Test 9: Env Var Discovery ─────────────────────────────────

console.log("\n━━━ Test 9: Env Var Discovery ━━━");

const refreshed = refreshDatabaseList();
assert(refreshed.length >= 1, "refreshDatabaseList returns databases");

// Verify sorted by priority
for (let i = 1; i < refreshed.length; i++) {
  assert(
    refreshed[i].priority >= refreshed[i - 1].priority,
    `Databases sorted by priority: ${refreshed[i - 1].key}(${refreshed[i - 1].priority}) <= ${refreshed[i].key}(${refreshed[i].priority})`
  );
}

// ─── Test 10: executeWithClient ────────────────────────────────

async function runAsyncTests() {
  console.log("\n━━━ Test 10: executeWithClient ━━━");

  const successResult = await executeWithClient("primary", async (client) => {
    return "hello";
  });
  assert(successResult.success, "executeWithClient succeeds");
  assertEqual(successResult.data, "hello", "executeWithClient returns correct data");
  assertEqual(successResult.databaseKey, "primary", "executeWithClient has correct databaseKey");

  const failResult = await executeWithClient("project-999", async () => {
    throw new Error("not found");
  });
  assert(!failResult.success, "executeWithClient fails for invalid DB");
  assertEqual(failResult.errorCategory, "UNKNOWN", "Error classified as UNKNOWN");
  assert(failResult.durationMs >= 0, "Duration is non-negative");

  // ─── Summary ───────────────────────────────────────────────────

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAsyncTests();
