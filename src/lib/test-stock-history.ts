/**
 * Test script to verify stock history API functionality
 * This can be used to test the API and create sample data if needed
 */

import { stockHistoryApi } from "./stock-history-api";
import { sanityClient } from "./sanity";

export const testStockHistory = {
  /**
   * Test fetching stock transactions
   */
  async testFetchTransactions() {
    console.log("Testing stock transactions fetch...");

    try {
      const result = await stockHistoryApi.getStockTransactions();
      console.log("Fetch result:", result);

      if (result.success) {
        console.log(`Found ${result.data?.length || 0} transactions`);
        if (result.data && result.data.length > 0) {
          console.log("Sample transaction:", result.data[0]);
        }
      } else {
        console.error("Fetch failed:", result.error);
      }

      return result;
    } catch (error) {
      console.error("Test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Test fetching summary
   */
  async testFetchSummary() {
    console.log("Testing stock history summary...");

    try {
      const result = await stockHistoryApi.getStockHistorySummary();
      console.log("Summary result:", result);

      return result;
    } catch (error) {
      console.error("Summary test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Check if stock transactions exist in database
   */
  async checkExistingData() {
    console.log("Checking existing stock transaction data...");

    try {
      const query = `{
        "stockTransactionCount": count(*[_type == "stockTransaction" && !defined(deleted)]),
        "productCount": count(*[_type == "product" && !defined(deleted) && isActive == true]),
        "sampleTransactions": *[_type == "stockTransaction" && !defined(deleted)][0...3] {
          _id,
          type,
          product->[!defined(deleted) && isActive == true]{name},
          quantity,
          totalAmount,
          transactionDate
        }[defined(product.name)]
      }`;

      const result = await sanityClient.fetch(query);
      console.log("Database check result:", result);

      return result;
    } catch (error) {
      console.error("Database check failed:", error);
      return null;
    }
  },

  /**
   * Create sample stock transactions for testing
   */
  async createSampleData() {
    console.log("Creating sample stock transaction data...");

    try {
      // First, get some active products to reference (not soft deleted)
      const products = await sanityClient.fetch(
        `*[_type == "product" && !defined(deleted) && isActive == true][0...3] { _id, name }`
      );

      if (products.length === 0) {
        console.log("No products found. Cannot create sample transactions.");
        return { success: false, error: "No products available" };
      }

      const sampleTransactions = [];

      // Create sample transactions for each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Purchase transaction
        const purchaseTransaction = {
          _type: "stockTransaction",
          transactionId: `SAMPLE_PURCHASE_${Date.now()}_${i}`,
          type: "purchase",
          product: { _type: "reference", _ref: product._id },
          quantity: 50 + i * 10,
          unitPrice: 100 + i * 20,
          totalAmount: (50 + i * 10) * (100 + i * 20),
          notes: `Sample purchase transaction for ${product.name}`,
          status: "completed",
          transactionDate: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date().toISOString(),
        };

        // Sale transaction
        const saleTransaction = {
          _type: "stockTransaction",
          transactionId: `SAMPLE_SALE_${Date.now()}_${i}`,
          type: "sale",
          product: { _type: "reference", _ref: product._id },
          quantity: 5 + i,
          unitPrice: 150 + i * 25,
          totalAmount: (5 + i) * (150 + i * 25),
          notes: `Sample sale transaction for ${product.name}`,
          status: "completed",
          transactionDate: new Date(
            Date.now() - i * 12 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date().toISOString(),
        };

        sampleTransactions.push(purchaseTransaction, saleTransaction);
      }

      // Create all transactions
      const results = await Promise.all(
        sampleTransactions.map((transaction) =>
          sanityClient.create(transaction)
        )
      );

      console.log(`Created ${results.length} sample transactions`);
      return { success: true, data: results };
    } catch (error) {
      console.error("Failed to create sample data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("=== Running Stock History API Tests ===");

    // Check existing data
    await this.checkExistingData();

    // Test fetch transactions
    const fetchResult = await this.testFetchTransactions();

    // If no transactions found, create sample data
    if (
      fetchResult.success &&
      (!fetchResult.data || fetchResult.data.length === 0)
    ) {
      console.log("No transactions found. Creating sample data...");
      await this.createSampleData();

      // Test again after creating sample data
      await this.testFetchTransactions();
    }

    // Test summary
    await this.testFetchSummary();

    console.log("=== Tests Complete ===");
  },
};

// Export for use in browser console or other scripts
if (typeof window !== "undefined") {
  (window as unknown).testStockHistory = testStockHistory;
}
