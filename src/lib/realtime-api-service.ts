import { sanityClient } from "./sanity";
import { toast } from "sonner";

// Enhanced API service with real-time capabilities
export class RealtimeApiService {
  private static instance: RealtimeApiService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): RealtimeApiService {
    if (!RealtimeApiService.instance) {
      RealtimeApiService.instance = new RealtimeApiService();
    }
    return RealtimeApiService.instance;
  }

  // Create a document with real-time notification
  async createDocument(type: string, data: any, showNotification = true) {
    try {
      const result = await sanityClient.create({
        _type: type,
        ...data,
      });

      if (showNotification) {
        toast.success(
          `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`
        );
      }

      return { success: true, data: result };
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
      if (showNotification) {
        toast.error(`Failed to create ${type}`);
      }
      return { success: false, error: `Failed to create ${type}` };
    }
  }

  // Update a document with real-time notification
  async updateDocument(id: string, data: any, showNotification = true) {
    try {
      const result = await sanityClient.patch(id).set(data).commit();

      if (showNotification) {
        toast.success("Document updated successfully");
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating document:", error);
      if (showNotification) {
        toast.error("Failed to update document");
      }
      return { success: false, error: "Failed to update document" };
    }
  }

  // Delete a document with real-time notification
  async deleteDocument(id: string, showNotification = true) {
    try {
      await sanityClient.delete(id);

      if (showNotification) {
        toast.success("Document deleted successfully");
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting document:", error);
      if (showNotification) {
        toast.error("Failed to delete document");
      }
      return { success: false, error: "Failed to delete document" };
    }
  }

  // Create a bill with inventory updates
  async createBillWithInventoryUpdate(billData: any, showNotification = true) {
    try {
      // Start a transaction
      const transaction = sanityClient.transaction();

      // Create the bill
      const billId = `bill-${Date.now()}`;
      transaction.create({
        _id: billId,
        _type: "bill",
        ...billData,
      });

      // Update inventory for each item
      if (billData.items && Array.isArray(billData.items)) {
        for (const item of billData.items) {
          if (item.product && item.product._ref) {
            // Get current product data
            const product = await sanityClient.fetch(
              `*[_type == "product" && _id == $productId][0]`,
              { productId: item.product._ref }
            );

            if (product) {
              const newStock = Math.max(
                0,
                product.inventory.currentStock - item.quantity
              );

              transaction.patch(item.product._ref).set({
                "inventory.currentStock": newStock,
                updatedAt: new Date().toISOString(),
              });

              // Create stock transaction
              transaction.create({
                _type: "stockTransaction",
                type: "sale",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: item.totalPrice,
                product: { _type: "reference", _ref: item.product._ref },
                billId: billId,
                transactionDate: new Date().toISOString(),
                notes: `Sale from bill #${billData.billNumber}`,
              });
            }
          }
        }
      }

      const result = await transaction.commit();

      if (showNotification) {
        toast.success(`Bill #${billData.billNumber} created successfully`);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating bill with inventory update:", error);
      if (showNotification) {
        toast.error("Failed to create bill");
      }
      return { success: false, error: "Failed to create bill" };
    }
  }

  // Update product inventory with stock transaction
  async updateProductInventory(
    productId: string,
    inventoryUpdate: {
      currentStock?: number;
      minimumStock?: number;
      maximumStock?: number;
      reorderLevel?: number;
    },
    transactionData?: {
      type: "purchase" | "sale" | "adjustment" | "return" | "damage";
      quantity: number;
      unitPrice: number;
      notes?: string;
    },
    showNotification = true
  ) {
    try {
      const transaction = sanityClient.transaction();

      // Update product inventory
      transaction.patch(productId).set({
        ...Object.fromEntries(
          Object.entries(inventoryUpdate).map(([key, value]) => [
            `inventory.${key}`,
            value,
          ])
        ),
        updatedAt: new Date().toISOString(),
      });

      // Create stock transaction if provided
      if (transactionData) {
        transaction.create({
          _type: "stockTransaction",
          ...transactionData,
          totalAmount: transactionData.quantity * transactionData.unitPrice,
          product: { _type: "reference", _ref: productId },
          transactionDate: new Date().toISOString(),
        });
      }

      const result = await transaction.commit();

      if (showNotification) {
        toast.success("Inventory updated successfully");
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating inventory:", error);
      if (showNotification) {
        toast.error("Failed to update inventory");
      }
      return { success: false, error: "Failed to update inventory" };
    }
  }

  // Bulk inventory update
  async bulkUpdateInventory(
    updates: Array<{
      productId: string;
      newStock: number;
      reason?: string;
    }>,
    showNotification = true
  ) {
    try {
      const transaction = sanityClient.transaction();

      for (const update of updates) {
        // Get current product data
        const product = await sanityClient.fetch(
          `*[_type == "product" && _id == $productId][0]`,
          { productId: update.productId }
        );

        if (product) {
          const stockDifference =
            update.newStock - product.inventory.currentStock;

          // Update product inventory
          transaction.patch(update.productId).set({
            "inventory.currentStock": update.newStock,
            updatedAt: new Date().toISOString(),
          });

          // Create stock transaction
          if (stockDifference !== 0) {
            transaction.create({
              _type: "stockTransaction",
              type: "adjustment",
              quantity: Math.abs(stockDifference),
              unitPrice: product.pricing?.purchasePrice || 0,
              totalAmount:
                Math.abs(stockDifference) *
                (product.pricing?.purchasePrice || 0),
              product: { _type: "reference", _ref: update.productId },
              transactionDate: new Date().toISOString(),
              notes: update.reason || "Bulk inventory adjustment",
            });
          }
        }
      }

      const result = await transaction.commit();

      if (showNotification) {
        toast.success(`${updates.length} products updated successfully`);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Error bulk updating inventory:", error);
      if (showNotification) {
        toast.error("Failed to update inventory");
      }
      return { success: false, error: "Failed to update inventory" };
    }
  }

  // Listen to specific document changes
  listenToDocument(
    documentType: string,
    documentId?: string,
    callback?: (update: any) => void
  ) {
    const query = documentId
      ? `*[_type == "${documentType}" && _id == "${documentId}"]`
      : `*[_type == "${documentType}"]`;

    const subscriptionKey = `${documentType}-${documentId || "all"}`;

    if (this.subscriptions.has(subscriptionKey)) {
      // Already listening to this query
      return;
    }

    const subscription = sanityClient
      .listen(query, {}, { includeResult: true })
      .subscribe({
        next: (update) => {
          if (callback) {
            callback(update);
          }
        },
        error: (error) => {
          console.error(`Error listening to ${documentType}:`, error);
          this.subscriptions.delete(subscriptionKey);
        },
      });

    this.subscriptions.set(subscriptionKey, subscription);
    console.log(`🔊 Started listening to ${documentType} changes`);
  }

  // Stop listening to document changes
  stopListening(documentType: string, documentId?: string) {
    const subscriptionKey = `${documentType}-${documentId || "all"}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
      console.log(`🔇 Stopped listening to ${documentType} changes`);
    }
  }

  // Stop all subscriptions
  stopAllListening() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe();
      console.log(`🔇 Stopped listening to ${key}`);
    });
    this.subscriptions.clear();
  }

  // Get real-time statistics
  async getRealtimeStats() {
    try {
      const [products, bills, users, stockTransactions] = await Promise.all([
        sanityClient.fetch(`*[_type == "product"]`),
        sanityClient.fetch(`*[_type == "bill"]`),
        sanityClient.fetch(`*[_type == "user"]`),
        sanityClient.fetch(`*[_type == "stockTransaction"]`),
      ]);

      const stats = {
        products: {
          total: products.length,
          active: products.filter((p: any) => p.isActive).length,
          lowStock: products.filter(
            (p: any) => p.inventory?.currentStock <= p.inventory?.minimumStock
          ).length,
        },
        bills: {
          total: bills.length,
          pending: bills.filter((b: any) => b.paymentStatus === "pending")
            .length,
          paid: bills.filter((b: any) => b.paymentStatus === "paid").length,
          totalRevenue: bills
            .filter((b: any) => b.paymentStatus === "paid")
            .reduce(
              (sum: number, bill: any) => sum + (bill.totalAmount || 0),
              0
            ),
        },
        users: {
          total: users.length,
          customers: users.filter((u: any) => u.role === "customer").length,
          admins: users.filter((u: any) => u.role === "admin").length,
        },
        stockTransactions: {
          total: stockTransactions.length,
          recent: stockTransactions.filter((t: any) => {
            const transactionDate = new Date(t.transactionDate || t.createdAt);
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return transactionDate >= yesterday;
          }).length,
        },
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error("Error fetching real-time stats:", error);
      return { success: false, error: "Failed to fetch stats" };
    }
  }
}

// Export singleton instance
export const realtimeApiService = RealtimeApiService.getInstance();
