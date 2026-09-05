// scripts/migrate-rentals.js
// One-time migration: copies all `tool` and `toolRental` documents (plus the
// customer documents they reference) from the legacy primary dataset into the
// rentals database, making the rentals DB the single source of truth for
// tool rentals.
//
// Usage:
//   node scripts/migrate-rentals.js            # run the migration (safe, createIfNotExists)
//   node scripts/migrate-rentals.js --inspect  # print counts + samples, do not write

const fs = require("fs");
const path = require("path");
const { createClient } = require("@sanity/client");

// ─── Load .env files ───────────────────────────────────────────

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const txt = fs.readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    process.env[m[1]] = m[2].trim();
  }
}
loadEnvFile(path.join(__dirname, "..", ".env.local"));
loadEnvFile(path.join(__dirname, "..", ".env"));

// ─── Clients ───────────────────────────────────────────────────

const primaryClient = createClient({
  projectId: process.env.SANITY_DB_PRIMARY_PROJECT_ID || "idji8ni7",
  dataset: process.env.SANITY_DB_PRIMARY_DATASET || "live-shop",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const rentalsClient = createClient({
  projectId: process.env.SANITY_DB_RENTALS_PROJECT_ID || "46od0fcp",
  dataset: process.env.SANITY_DB_RENTALS_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_DB_RENTALS_TOKEN,
});

const customersClient = createClient({
  projectId: process.env.SANITY_DB_CUSTOMERS_PROJECT_ID || "wpzry5rh",
  dataset: process.env.SANITY_DB_CUSTOMERS_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_DB_CUSTOMERS_TOKEN,
});

// ─── Helpers ───────────────────────────────────────────────────

const META_FIELDS = ["_rev", "_createdAt", "_updatedAt", "_system"];

function cleanDoc(doc, options = {}) {
  if (!doc) return doc;
  const cleaned = { ...doc };
  for (const field of META_FIELDS) delete cleaned[field];
  if (options.stripImages && cleaned.image) {
    delete cleaned.image;
  }
  return cleaned;
}

function collectRefs(doc) {
  const refs = [];
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value._type === "reference" && typeof value._ref === "string") {
      refs.push(value._ref);
    }
    for (const key of Object.keys(value)) walk(value[key]);
  };
  walk(doc);
  return [...new Set(refs)];
}

async function fetchByIds(client, ids) {
  if (!ids.length) return [];
  const results = [];
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const docs = await client.fetch("*[_id in $ids]", { ids: chunk });
      results.push(...docs);
    } catch {
      /* doc may not exist on this client */
    }
  }
  return results;
}

async function createBatch(client, docs, options = {}) {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const batchSize = options.batchSize || 50;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    let tx = client.transaction();
    for (const doc of chunk) {
      tx = tx.createIfNotExists(doc);
    }
    try {
      await tx.commit();
      created += chunk.length;
    } catch (err) {
      const msg = String((err && err.message) || err);
      console.error(`Batch ${i / batchSize + 1} failed (${chunk.length} docs): ${msg}`);
      for (const doc of chunk) {
        try {
          await client.createIfNotExists(doc);
          created++;
        } catch (docErr) {
          const docMsg = String((docErr && docErr.message) || docErr);
          if (/references non-existent|already exists/i.test(docMsg)) {
            skipped++;
            continue;
          }
          failed++;
          if (options.verbose) {
            console.error(`  FAILED ${doc._id} (${doc._type}): ${docMsg}`);
          }
        }
      }
    }
  }
  return { created, skipped, failed };
}

async function runInspect() {
  const tools = (await primaryClient.fetch(`*[_type == "tool"]`)) || [];
  const rentals = (await primaryClient.fetch(`*[_type == "toolRental"]`)) || [];
  const rentalDbTools = (await rentalsClient.fetch(`*[_type == "tool"]`)) || [];
  const rentalDbRentals = (await rentalsClient.fetch(`*[_type == "toolRental"]`)) || [];

  console.log("PRIMARY tools:     ", tools.length);
  console.log("PRIMARY rentals:   ", rentals.length);
  console.log("RENTALS tools:     ", rentalDbTools.length);
  console.log("RENTALS rentals:   ", rentalDbRentals.length);
  console.log("TOOLS WITH IMAGE:  ", tools.filter((t) => t.image).length);

  if (tools.length) {
    console.log("TOOL SAMPLE:", JSON.stringify(cleanDoc(tools[0]), null, 2).slice(0, 3000));
    const toolRefs = tools.map(collectRefs).flat();
    console.log("TOOL REF KEYS:", toolRefs.length ? toolRefs.slice(0, 10) : "(none)");
  }
  if (rentals.length) {
    console.log("RENTAL SAMPLE:", JSON.stringify(cleanDoc(rentals[0]), null, 2).slice(0, 3000));
    const refs = collectRefs(rentals[0]);
    console.log("RENTAL REF KEYS:", refs);
  }
}

async function runMigration() {
  console.log("Loading source docs from primary...");
  const tools = (await primaryClient.fetch(`*[_type == "tool"]`)) || [];
  const rentals = (await primaryClient.fetch(`*[_type == "toolRental"]`)) || [];

  console.log(`Found ${tools.length} tools and ${rentals.length} rentals in primary.`);

  // Customer docs referenced by rentals (live in primary or the customers DB).
  const customerRefs = [...new Set(rentals.map((r) => r.customer && r.customer._ref).filter(Boolean))];
  console.log(`Resolving ${customerRefs.length} referenced customer documents...`);
  const customersFromPrimary = await fetchByIds(primaryClient, customerRefs);
  const customersFromWpz = await fetchByIds(customersClient, customerRefs);
  const customerById = new Map();
  for (const c of [...customersFromPrimary, ...customersFromWpz]) customerById.set(c._id, c);

  // Any docs already in the rentals DB may reference tools/customers that live
  // only in primary. Pull those in too so the rentals DB becomes self-contained.
  const existingRentalDbTools = (await rentalsClient.fetch(`*[_type == "tool"]`)) || [];
  const existingRentalDbRentals = (await rentalsClient.fetch(`*[_type == "toolRental"]`)) || [];
  const existingIds = new Set([...existingRentalDbTools, ...existingRentalDbRentals].map((d) => d._id));
  const extraRefs = collectRefs([...existingRentalDbRentals, ...existingRentalDbTools]).filter((ref) => !existingIds.has(ref));
  const extraTools = await fetchByIds(primaryClient, extraRefs.filter((r) => !r.startsWith("image-") && !r.startsWith("file-")));
  const extraCustomers = await fetchByIds(customersClient, extraRefs.filter((r) => !r.startsWith("image-") && !r.startsWith("file-")));

  // Non-asset reference IDs referenced by tools/today's rentals, resolved later
  // for missing ones.
  const pendingRefs = new Set();
  for (const d of [...tools, ...rentals]) {
    for (const ref of collectRefs(d)) {
      if (!ref.startsWith("image-") && !ref.startsWith("file-")) pendingRefs.add(ref);
    }
  }
  const otherRefs = await fetchByIds(primaryClient, [...pendingRefs]);
  const otherRefsWpz = await fetchByIds(customersClient, [...pendingRefs]);

  // Build the write set. Tools have their image stripped by default so asset
  // references (which cannot be copied without their blobs) never fail.
  const toolsToWrite = tools.map((t) => cleanDoc(t, { stripImages: true }));
  const customersToWrite = [...customerById.values()].map((c) => cleanDoc(c));
  const extraToWrite = [
    ...new Map(
      [...extraTools, ...extraCustomers, ...otherRefs, ...otherRefsWpz].map((d) => [d._id, d]),
    ).values(),
  ]
    .filter((d) => !tools.some((t) => t._id === d._id) && !rentals.some((r) => r._id === d._id))
    .map((d) => cleanDoc(d, { stripImages: true }));
  const rentalsToWrite = rentals.map((r) => cleanDoc(r));

  console.log(`Writing ${toolsToWrite.length} tools, ${customersToWrite.length} customers, ${extraToWrite.length} extra referenced docs, ${rentalsToWrite.length} rentals...`);

  const r1 = await createBatch(rentalsClient, toolsToWrite, { verbose: true });
  console.log(`Tools: created ${r1.created}, skipped ${r1.skipped}, failed ${r1.failed}`);
  const r2 = await createBatch(rentalsClient, customersToWrite, { verbose: true });
  console.log(`Customers: created ${r2.created}, skipped ${r2.skipped}, failed ${r2.failed}`);
  const r3 = await createBatch(rentalsClient, extraToWrite, { verbose: true });
  console.log(`Extra referenced docs: created ${r3.created}, skipped ${r3.skipped}, failed ${r3.failed}`);
  const r4 = await createBatch(rentalsClient, rentalsToWrite, { verbose: true });
  console.log(`Rentals: created ${r4.created}, skipped ${r4.skipped}, failed ${r4.failed}`);

  const total = r1.created + r2.created + r3.created + r4.created;
  const failed = r1.failed + r2.failed + r3.failed + r4.failed;
  console.log("Migration complete.");
  console.log(`Created: ${total}, Failed: ${failed}.`);
  if (failed > 0) console.log("Re-run with --verbose note: some docs may need manual attention.");
  return { created: total, failed };
}

async function main() {
  const inspect = process.argv.includes("--inspect");
  if (inspect) {
    await runInspect();
  } else {
    await runMigration();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}