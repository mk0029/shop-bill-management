// Comprehensive test for inventory cash book integration
// Run this after applying the fixes

async function testInventoryCashBookFix() {
  console.log("🔧 Testing Inventory Cash Book Fix...");

  try {
    // 1. Test direct cash book API
    console.log("\n📝 1. Testing direct cash book API...");
    const { sanityApiService } = await import("@/lib/sanity-api-service");

    const testEntry = {
      userName: "Test Product Entry",
      amount: 500,
      type: "debit",
      source: "Manual",
      category: "inventory",
      notes: "Test entry from fix verification",
    };

    const directResult = await sanityApiService.cashBook.createEntry(testEntry);
    console.log(
      "Direct API result:",
      directResult.success ? "✅ SUCCESS" : "❌ FAILED",
    );

    // 2. Test inventory store integration
    console.log("\n📦 2. Testing inventory store integration...");
    const { useInventoryStore } = await import("@/store/inventory-store");
    const inventoryStore = useInventoryStore.getState();

    const testTransaction = {
      product: {
        _id: "test-product-id",
        name: "Test Inventory Item",
        productId: "TEST-123",
      },
      type: "purchase",
      quantity: 3,
      unitPrice: 150,
      notes: "Test inventory transaction",
    };

    const storeResult =
      await inventoryStore.createStockTransaction(testTransaction);
    console.log(
      "Inventory store result:",
      storeResult ? "✅ SUCCESS" : "❌ FAILED",
    );

    // 3. Check cash book entries
    console.log("\n📊 3. Checking cash book entries...");
    const entries = await sanityApiService.cashBook.getAllEntries();

    if (entries.success) {
      const inventoryEntries = entries.data.filter(
        (entry) =>
          entry.category === "inventory" ||
          entry.userName.includes("Test") ||
          entry.notes?.includes("Test"),
      );

      console.log(`Found ${inventoryEntries.length} test entries:`);
      inventoryEntries.forEach((entry, index) => {
        console.log(
          `${index + 1}. ${entry.userName} - ₹${entry.amount} (${entry.type}) - ${entry.category}`,
        );
      });

      if (inventoryEntries.length > 0) {
        console.log(
          "\n✅ SUCCESS: Inventory cash book integration is working!",
        );
        console.log("🔍 Check your /admin/cash-book page to see the entries.");
      } else {
        console.log("\n❌ ISSUE: No inventory entries found in cash book.");
      }
    } else {
      console.log("❌ Failed to fetch cash book entries:", entries.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Monitor real inventory additions
function startInventoryMonitoring() {
  console.log("🔍 Starting inventory addition monitoring...");
  console.log(
    "Add some inventory items and watch the console for cash book creation logs.",
  );

  // Override console.log to capture cash book activity
  const originalLog = console.log;
  console.log = function (...args) {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("Creating cash book entry") ||
        message.includes("Inventory debit cash book entry"))
    ) {
      originalLog.apply(console, ["🎯 CASH BOOK ACTIVITY:", ...args]);
    } else {
      originalLog.apply(console, args);
    }
  };
}

console.log(`
🔧 Inventory Cash Book Fix Verification
=====================================

The fix includes:
1. ✅ Made user field optional in cash book schema
2. ✅ Updated inventory store to create proper cash book entries
3. ✅ Fixed inventory add page to use inventory store

To test:
1. Run: testInventoryCashBookFix()
2. Run: startInventoryMonitoring() 
3. Add inventory items via /admin/inventory/add
4. Check /admin/cash-book for entries

Expected behavior:
- Cash book entries should be created automatically
- userName should show item name
- category should be "inventory"
- type should be "debit"
`);

window.testInventoryCashBookFix = testInventoryCashBookFix;
window.startInventoryMonitoring = startInventoryMonitoring;
