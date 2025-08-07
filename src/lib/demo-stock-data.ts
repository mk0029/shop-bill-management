/**
 * Demo Stock Data Creator
 * Creates sample stock transactions for testing the history page
 */

import { sanityClient } from "./sanity";

export const demoStockData = {
  /**
   * Check if stock transactions exist
   */
  async checkExistingData() {
    try {
      const result = await sanityClient.fetch(`{
        "stockTransactionCount": count(*[_type == "stockTransaction" && !defined(deleted)]),
        "productCount": count(*[_type == "product" && !defined(deleted) && isActive == true]),
        "sampleProducts": *[_type == "product" && !defined(deleted) && isActive == true][0...3] {
          _id,
          name,
          pricing
        }
      }`);

      console.log("Database check:", result);
      return result;
    } catch (error) {
      console.error("Failed to check existing data:", error);
      return null;
    }
  },

  /**
   * Create sample stock transactions
   */
  async createSampleTransactions() {
    try {
      // First get some active products (not soft deleted)
      const products =
        await sanityClient.fetch(`*[_type == "product" && !defined(deleted) && isActive == true][0...3] {
        _id,
        name,
        pricing
      }`);

      if (products.length === 0) {
        console.log("No products found. Cannot create sample transactions.");
        return { success: false, error: "No products available" };
      }

      const sampleTransactions = [];
      const now = new Date();

      // Create transactions for each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const basePrice = product.pricing?.sellingPrice || 100;

        // Purchase transaction (older)
        const purchaseDate = new Date(
          now.getTime() - (i + 1) * 24 * 60 * 60 * 1000
        );
        const purchaseTransaction = {
          _type: "stockTransaction",
          transactionId: `DEMO_PURCHASE_${Date.now()}_${i}`,
          type: "purchase",
          product: { _type: "reference", _ref: product._id },
          quantity: 50 + i * 10,
          unitPrice: basePrice * 0.7, // Purchase at 70% of selling price
          totalAmount: (50 + i * 10) * (basePrice * 0.7),
          notes: `Demo purchase transaction for ${product.name}`,
          status: "completed",
          transactionDate: purchaseDate.toISOString(),
          createdAt: new Date().toISOString(),
        };

        // Sale transaction (newer)
        const saleDate = new Date(now.getTime() - i * 12 * 60 * 60 * 1000);
        const saleTransaction = {
          _type: "stockTransaction",
          transactionId: `DEMO_SALE_${Date.now()}_${i}`,
          type: "sale",
          product: { _type: "reference", _ref: product._id },
          quantity: 5 + i,
          unitPrice: basePrice,
          totalAmount: (5 + i) * basePrice,
          notes: `Demo sale transaction for ${product.name}`,
          status: "completed",
          transactionDate: saleDate.toISOString(),
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

      console.log(`Created ${results.length} demo transactions`);
      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Failed to create sample transactions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Initialize demo data if needed
   */
  async initializeDemoData() {
    console.log("Initializing demo stock data...");

    const existingData = await this.checkExistingData();

    if (!existingData) {
      return { success: false, error: "Failed to check existing data" };
    }

    if (existingData.stockTransactionCount === 0) {
      console.log("No stock transactions found. Creating demo data...");
      return await this.createSampleTransactions();
    } else {
      console.log(
        `Found ${existingData.stockTransactionCount} existing transactions`
      );
      return {
        success: true,
        message: `Using existing ${existingData.stockTransactionCount} transactions`,
        existing: true,
      };
    }
  },

  /**
   * Clean up demo data (removes transactions with "DEMO_" prefix)
   */
  async cleanupDemoData() {
    try {
      const demoTransactions = await sanityClient.fetch(
        `*[_type == "stockTransaction" && transactionId match "DEMO_*"]._id`
      );

      if (demoTransactions.length === 0) {
        return { success: true, message: "No demo data to clean up" };
      }

      // Delete all demo transactions
      await Promise.all(
        demoTransactions.map((id: string) => sanityClient.delete(id))
      );

      console.log(`Cleaned up ${demoTransactions.length} demo transactions`);
      return {
        success: true,
        message: `Removed ${demoTransactions.length} demo transactions`,
      };
    } catch (error) {
      console.error("Failed to cleanup demo data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Make available in browser console for testing
if (typeof window !== "undefined") {
  (window as unknown).demoStockData = demoStockData;
}
