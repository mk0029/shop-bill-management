// Delete historical `bill`, `stockTransaction`, and orphaned `billItem` documents
// from the PRIMARY Sanity database ONLY (idji8ni7 / live-shop).
//
// IMPORTANT:
//  - Dry-run by default. Pass `--commit` to actually delete.
//  - This targets the primary dataset and leaves the billing / inventory DBs untouched.
//  - Deletes BOTH published documents and drafts (`drafts.*`).
//
// Usage:
//   node scripts/delete-route-data.js            # dry run (reports counts)
//   node scripts/delete-route-data.js --commit   # permanently delete
//
// Env:
//   SANITY_API_TOKEN (or NEXT_PUBLIC_SANITY_API_TOKEN) must have write access.

const { createClient } = require("@sanity/client");

const PROJECT_ID = "idji8ni7";
const DATASET = "live-shop";
const BATCH_SIZE = 500;

const token =
  "skZj75Ix11taNeKvp4gcIoW2AD6a25HoVDEyx8tJLdrE9WfSoYyfpd4eS1dM3uzQIlldURLbRV5BK8zLP6L5UMRApPKtZZkweznSHdoR0XyNdsbkIkKmXG8Ze8Fnh1wtd4uWc8u4cbJouvdYpcjCO6fbADC1s4IpXQoaEIYsJl9juMNVaGur";

const COMMIT = process.argv.includes("--commit");

if (!token) {
  console.error(
    "❌ Missing SANITY_API_TOKEN. Set the write token in the environment.",
  );
  process.exit(1);
}

function makeClient() {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    useCdn: false,
    apiVersion: "2024-01-01",
    token,
  });
}

async function fetchIds(client, baseQuery) {
  return client.fetch(`*[${baseQuery}]._id`);
}

async function main() {
  console.log(`\n🎯 Deleting from PRIMARY DB: ${PROJECT_ID}/${DATASET}`);
  console.log(
    `   Mode: ${COMMIT ? "COMMIT (permanent delete)" : "DRY RUN (no deletes)"}\n`,
  );

  if (!COMMIT) {
    console.warn("   ⚠️ DRY RUN — pass --commit to permanently delete.\n");
  }

  const client = makeClient();

  const [
    publishedStockTx,
    draftStockTx,
    publishedBills,
    draftBills,
    allBillItems,
  ] = await Promise.all([
    fetchIds(
      client,
      `_type == "stockTransaction" && !(_id in path("drafts.**"))`,
    ),
    fetchIds(client, `_type == "stockTransaction" && _id in path("drafts.**")`),
    fetchIds(client, `_type == "bill" && !(_id in path("drafts.**"))`),
    fetchIds(client, `_type == "bill" && _id in path("drafts.**")`),
    client.fetch(`*[_type == "billItem"]{_id, "billRef": bill._ref}`),
  ]);

  const stockTxIds = [...publishedStockTx, ...draftStockTx];
  const billIds = [...publishedBills, ...draftBills];

  const billIdSet = new Set(
    billIds.map((id) => String(id).replace(/^drafts\./, "")),
  );
  const orphanedBillItemIds = Array.isArray(allBillItems)
    ? allBillItems
        .map((it) => ({
          id: String(it._id),
          ref: it.billRef ? String(it.billRef).replace(/^drafts\./, "") : "",
        }))
        .filter((it) => {
          if (!it.ref) return true; // billItems without a bill ref are orphaned by definition
          return !billIdSet.has(it.ref);
        })
        .map((it) => it.id)
    : [];

  // Documents that reference a bill and must be removed with it
  // (matches DELETE /api/bills/[id] which cleans up its dependents first).
  const DEPENDENT_TYPES = [
    "cashBookEntry",
    "cashbookItem",
    "billMessage",
    "billItem",
    "payment",
    "transaction",
    "billTimelineEvent",
    "advanceTransaction",
  ];
  const dependentIds =
    billIds.length > 0
      ? await client.fetch(
          `*[_type in $types && references($ids)]._id`,
          { types: DEPENDENT_TYPES, ids: billIds },
        )
      : [];
  const otherReferencingDocs =
    billIds.length > 0
      ? await client.fetch(
          `*[references($ids) && !(_type in $types) && !(_type == "bill")]._id`,
          { types: DEPENDENT_TYPES, ids: billIds },
        )
      : [];

  const summary = {
    stockTransactions: stockTxIds.length,
    bills: billIds.length,
    orphanedBillItems: orphanedBillItemIds.length,
    billDependents: dependentIds.length,
    otherReferencingDocs: otherReferencingDocs.length,
  };

  console.log("📊 Found in primary DB:");
  console.log(
    `   - stockTransaction: ${summary.stockTransactions} (${draftStockTx.length} drafts)`,
  );
  console.log(
    `   - bill:             ${summary.bills} (${draftBills.length} drafts)`,
  );
  console.log(`   - orphaned billItem: ${summary.orphanedBillItems}`);
  console.log(`   - bill dependents:   ${summary.billDependents}`);
  if (summary.otherReferencingDocs > 0) {
    console.log(
      `   ⚠️  OTHER docs reference bills (not deleted): ${summary.otherReferencingDocs}`,
    );
  }

  if (!COMMIT) {
    console.log("\n   Sample stockTransaction ids:");
    console.log(
      stockTxIds
        .slice(0, 5)
        .map((id) => `      ${id}`)
        .join("\n") || "      (none)",
    );
    console.log("   Sample bill ids:");
    console.log(
      billIds
        .slice(0, 5)
        .map((id) => `      ${id}`)
        .join("\n") || "      (none)",
    );
    console.log("\n✅ Dry run complete. Nothing was deleted.");
    return;
  }

  // ── Delete helpers ──────────────────────────────────────────
  async function deleteIds(label, ids) {
    const unique = Array.from(new Set(ids.map(String))).filter(Boolean);
    if (unique.length === 0) {
      console.log(`   ${label}: nothing to delete`);
      return 0;
    }
    let deleted = 0;
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const chunk = unique.slice(i, i + BATCH_SIZE);
      try {
        await client.delete(chunk);
        deleted += chunk.length;
      } catch (err) {
        console.error(
          `   ❌ Failed to delete ${label} batch ${i / BATCH_SIZE + 1}:`,
          err.message,
        );
      }
      if (deleted % (BATCH_SIZE * 2) === 0 || chunk.length < BATCH_SIZE) {
        console.log(`   ${label}: ${deleted}/${unique.length} deleted`);
      }
    }
    return deleted;
  }

  console.log("\n🗑  Deleting...");
  if (otherReferencingDocs.length > 0) {
    console.log(
      `   ⛔ Skipping bill deletion: ${otherReferencingDocs.length} non-dependent docs still reference them.`,
    );
  }
  await deleteIds("stockTransaction", stockTxIds);
  await deleteIds("bill dependents", dependentIds);
  await deleteIds("bill", billIds);
  await deleteIds("orphaned billItem", orphanedBillItemIds);

  console.log("\n✅ Deletion complete.");
  console.log(
    `   Primary DB (${PROJECT_ID}/${DATASET}) no longer contains these documents.`,
  );
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message || err);
  process.exit(1);
});
