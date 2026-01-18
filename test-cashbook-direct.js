// Direct test of cash book API
// Run this in browser console to test if cash book entries can be created

async function testCashBookAPI() {
  console.log("🧪 Testing Cash Book API directly...");

  try {
    // Import the sanity API service
    const { sanityApiService } = await import("@/lib/sanity-api-service");

    // Test data
    const testEntry = {
      userName: "Test Product",
      amount: 500,
      type: "debit",
      source: "Manual",
      category: "inventory",
      notes: "Test inventory entry from debug script",
    };

    console.log("📝 Creating test cash book entry:", testEntry);

    // Create the entry
    const result = await sanityApiService.cashBook.createEntry(testEntry);

    console.log("✅ Cash book entry created:", result);

    if (result.success) {
      console.log("📊 Entry details:", result.data);
      console.log("🔍 Check your cash book page to see this entry!");
    } else {
      console.error("❌ Failed to create entry:", result.error);
    }

    // Test fetching entries
    console.log("📋 Fetching all cash book entries...");
    const entries = await sanityApiService.cashBook.getAllEntries();

    if (entries.success) {
      console.log("✅ Found entries:", entries.data.length);
      console.log("📊 Latest entries:", entries.data.slice(0, 3));
    } else {
      console.error("❌ Failed to fetch entries:", entries.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Test the inventory store directly
async function testInventoryStoreCashBook() {
  console.log("🧪 Testing Inventory Store Cash Book integration...");

  try {
    // Import the inventory store
    const { useInventoryStore } = await import("@/store/inventory-store");
    const inventoryStore = useInventoryStore.getState();

    // Test creating a stock transaction directly
    const testTransaction = {
      product: {
        _id: "test-product-id",
        name: "Test Product",
        productId: "TEST-123",
      },
      type: "purchase",
      quantity: 5,
      unitPrice: 100,
      notes: "Test transaction from debug script",
    };

    console.log("📦 Creating test stock transaction:", testTransaction);

    const result = await inventoryStore.createStockTransaction(testTransaction);

    console.log("✅ Stock transaction created:", result);

    // Check cash book entries
    const { sanityApiService } = await import("@/lib/sanity-api-service");
    const entries = await sanityApiService.cashBook.getAllEntries();

    if (entries.success) {
      const inventoryEntries = entries.data.filter(
        (entry) => entry.category === "inventory",
      );
      console.log(
        "📊 Inventory entries in cash book:",
        inventoryEntries.length,
      );
      console.log("📊 Latest inventory entries:", inventoryEntries.slice(0, 3));
    }
  } catch (error) {
    console.error("❌ Inventory store test failed:", error);
  }
}

console.log(`
🧪 Cash Book Debug Tools
========================

1. Test cash book API directly:
   testCashBookAPI()

2. Test inventory store integration:
   testInventoryStoreCashBook()

3. Check console logs for cash book activity when adding inventory
`);

// Make functions available globally
window.testCashBookAPI = testCashBookAPI;
window.testInventoryStoreCashBook = testInventoryStoreCashBook;
