// Test script to verify inventory cash book integration
// This script can be run in the browser console to test the functionality

async function testInventoryCashBookIntegration() {
  console.log("🧪 Testing Inventory Cash Book Integration...");

  try {
    // Get the inventory store
    const { useInventoryStore } = await import("@/store/inventory-store");
    const inventoryStore = useInventoryStore.getState();

    // Test data for a new product
    const testProduct = {
      name: "Test Product for Cash Book",
      description: "Test product to verify cash book entry creation",
      brandId: "test-brand",
      brandName: "Test Brand",
      categoryId: "test-category",
      specifications: {},
      pricing: {
        purchasePrice: 100,
        sellingPrice: 150,
        unit: "pcs",
      },
      inventory: {
        currentStock: 5,
        minimumStock: 2,
        reorderLevel: 1,
      },
      tags: ["test"],
    };

    console.log("📦 Adding test product:", testProduct);

    // Add the product (this should create a purchase transaction and cash book entry)
    const result = await inventoryStore.addOrUpdateProduct(testProduct);

    if (result.success) {
      console.log("✅ Product added successfully:", result.data);
      console.log("💰 Check your cash book for a debit entry with:");
      console.log('   - Name: "Test Product for Cash Book"');
      console.log('   - Category: "inventory"');
      console.log('   - Type: "debit"');
      console.log("   - Amount: ₹500 (5 × ₹100)");
      console.log('   - Source: "Manual"');
      console.log('   - Notes: "Inventory purchase: 5 units at ₹100 each"');

      // Test adding more stock (should create adjustment transaction)
      console.log("\n📈 Testing stock addition...");
      const updateResult = await inventoryStore.updateProductDetails(
        result.data._id,
        {
          name: "Test Product for Cash Book",
          pricing: { purchasePrice: 100, sellingPrice: 150 },
          stockToAdd: 3,
        },
      );

      if (updateResult) {
        console.log("✅ Stock updated successfully");
        console.log("💰 Check your cash book for another debit entry with:");
        console.log('   - Name: "Test Product for Cash Book"');
        console.log('   - Category: "inventory"');
        console.log('   - Type: "debit"');
        console.log("   - Amount: ₹300 (3 × ₹100)");
        console.log('   - Source: "Manual"');
        console.log('   - Notes: "Inventory adjustment: 3 units at ₹100 each"');
      } else {
        console.log("❌ Failed to update stock");
      }
    } else {
      console.error("❌ Failed to add product:", result.error);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Instructions for testing
console.log(`
🧪 Inventory Cash Book Integration Test
=====================================

To test the inventory cash book integration:

1. Open your browser's developer console (F12)
2. Copy and paste this entire script
3. Run the test function: testInventoryCashBookIntegration()

Expected behavior:
- When you add inventory, a debit entry should be created in the cash book
- The entry should have:
  * userName = item name
  * category = "inventory"  
  * type = "debit"
  * source = "Manual"
  * notes with transaction details

4. Check your cash book page to verify the entries were created correctly

Note: Make sure you're logged in and have the necessary permissions.
`);

// Export the test function
window.testInventoryCashBookIntegration = testInventoryCashBookIntegration;
