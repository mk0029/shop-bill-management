/**
 * Enhanced Inventory API Service
 * Provides comprehensive inventory management functions
 */

import { sanityClient } from "./sanity";
import {
  validateStockAvailability,
  fetchLatestPrices,
  updateStockForBill,
  getStockHistory,
  getLowStockAlerts,
  calculateInventoryValue,
  BillItem,
  StockValidationResult,
  PriceInfo,
} from "./inventory-management";

export interface InventoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductWithStock {
  _id: string;
  name: string;
  brand: { name: string };
  category: { name: string };
  inventory: {
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
  };
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    unit: string;
  };
  updatedAt: string;
}

export interface StockAlert {
  productId: string;
  productName: string;
  brandName: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  alertLevel: "out_of_stock" | "low_stock" | "reorder_needed";
}

export const enhancedInventoryApi = {
  /**
   * Validate stock before creating a bill
   */
  async validateBillStock(items: BillItem[]): Promise<
    InventoryApiResponse<{
      isValid: boolean;
      validationResults: StockValidationResult[];
      errors: string[];
    }>
  > {
    try {
      const result = await validateStockAvailability(items);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to validate stock",
      };
    }
  },

  /**
   * Get latest prices for products
   */
  async getLatestPrices(
    productIds: string[]
  ): Promise<InventoryApiResponse<Map<string, PriceInfo>>> {
    try {
      const priceMap = await fetchLatestPrices(productIds);
      return {
        success: true,
        data: priceMap,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch prices",
      };
    }
  },

  /**
   * Process stock updates for a bill
   */
  async processBillStockUpdate(
    items: BillItem[],
    billId: string,
    operation: "reduce" | "restore" = "reduce"
  ): Promise<InventoryApiResponse> {
    try {
      const result = await updateStockForBill(items, billId, operation);
      return {
        success: result.success,
        data: result,
        error: result.success ? undefined : result.errors.join(", "),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update stock",
      };
    }
  },

  /**
   * Get stock transaction history for a product
   */
  async getProductStockHistory(
    productId: string,
    limit: number = 50
  ): Promise<InventoryApiResponse> {
    try {
      const result = await getStockHistory(productId, limit);
      return {
        success: result.success,
        data: result.history,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stock history",
      };
    }
  },

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<InventoryApiResponse<StockAlert[]>> {
    try {
      const result = await getLowStockAlerts();

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Transform alerts with alert levels
      const alerts: StockAlert[] = result.alerts.map((product: any) => ({
        productId: product._id,
        productName: product.name,
        brandName: product.brand?.name || "Unknown",
        currentStock: product.inventory.currentStock,
        minimumStock: product.inventory.minimumStock,
        reorderLevel: product.inventory.reorderLevel,
        alertLevel:
          product.inventory.currentStock <= 0
            ? "out_of_stock"
            : product.inventory.currentStock <= product.inventory.minimumStock
            ? "low_stock"
            : "reorder_needed",
      }));

      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch low stock alerts",
      };
    }
  },

  /**
   * Calculate total inventory value
   */
  async getInventoryValue(): Promise<
    InventoryApiResponse<{
      totalValue: number;
      totalItems: number;
      breakdown: any[];
    }>
  > {
    try {
      const result = await calculateInventoryValue();

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          totalValue: result.totalValue,
          totalItems: result.totalItems,
          breakdown: result.breakdown,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate inventory value",
      };
    }
  },

  /**
   * Get products with current stock levels
   */
  async getProductsWithStock(filters?: {
    category?: string;
    brand?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  }): Promise<InventoryApiResponse<ProductWithStock[]>> {
    try {
      let query = `*[_type == "product" && isActive == true`;
      const params: Record<string, unknown> = {};

      if (filters?.category) {
        query += ` && category->name match $category`;
        params.category = filters.category;
      }

      if (filters?.brand) {
        query += ` && brand->name match $brand`;
        params.brand = filters.brand;
      }

      if (filters?.lowStock) {
        query += ` && inventory.currentStock <= inventory.minimumStock`;
      }

      if (filters?.outOfStock) {
        query += ` && inventory.currentStock <= 0`;
      }

      query += `] {
        _id,
        name,
        brand->{name},
        category->{name},
        inventory {
          currentStock,
          minimumStock,
          reorderLevel
        },
        pricing {
          purchasePrice,
          sellingPrice,
          unit
        },
        updatedAt
      } | order(name asc)`;

      const products = await sanityClient.fetch(query, params);

      return {
        success: true,
        data: products,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch products with stock",
      };
    }
  },

  /**
   * Get stock movement summary for a date range
   */
  async getStockMovementSummary(
    startDate: string,
    endDate: string
  ): Promise<
    InventoryApiResponse<{
      totalTransactions: number;
      totalSales: number;
      totalPurchases: number;
      totalValue: number;
      topMovingProducts: any[];
    }>
  > {
    try {
      const query = `{
        "transactions": *[_type == "stockTransaction" && transactionDate >= $startDate && transactionDate <= $endDate] {
          type,
          quantity,
          totalAmount,
          product->{
            _id,
            name,
            brand->{name}
          }
        },
        "summary": {
          "totalTransactions": count(*[_type == "stockTransaction" && transactionDate >= $startDate && transactionDate <= $endDate]),
          "totalSales": count(*[_type == "stockTransaction" && type == "sale" && transactionDate >= $startDate && transactionDate <= $endDate]),
          "totalPurchases": count(*[_type == "stockTransaction" && type == "purchase" && transactionDate >= $startDate && transactionDate <= $endDate])
        }
      }`;

      const result = await sanityClient.fetch(query, { startDate, endDate });

      // Calculate totals and top moving products
      let totalValue = 0;
      const productMovement = new Map();

      result.transactions.forEach((transaction: unknown) => {
        totalValue += transaction.totalAmount;

        const productId = transaction.product._id;
        if (!productMovement.has(productId)) {
          productMovement.set(productId, {
            productId,
            name: transaction.product.name,
            brand: transaction.product.brand?.name || "Unknown",
            totalQuantity: 0,
            totalValue: 0,
            transactions: 0,
          });
        }

        const product = productMovement.get(productId);
        product.totalQuantity += Math.abs(transaction.quantity);
        product.totalValue += transaction.totalAmount;
        product.transactions += 1;
      });

      const topMovingProducts = Array.from(productMovement.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      return {
        success: true,
        data: {
          totalTransactions: result.summary.totalTransactions,
          totalSales: result.summary.totalSales,
          totalPurchases: result.summary.totalPurchases,
          totalValue,
          topMovingProducts,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stock movement summary",
      };
    }
  },

  /**
   * Delete product(s) from inventory with enhanced conflict resolution
   */
  async deleteProduct(
    productId: string,
    deleteConsolidated: boolean = false,
    consolidatedIds?: string[]
  ): Promise<InventoryApiResponse> {
    try {
      const idsToDelete =
        deleteConsolidated && consolidatedIds ? consolidatedIds : [productId];

      const results = [];
      const errors = [];

      for (const id of idsToDelete) {
        try {
          // Get comprehensive product info and references
          const productInfo = await sanityClient.fetch(
            `*[_type == "product" && _id == $id][0] {
              _id,
              name,
              inventory { currentStock },
              "activeTransactions": count(*[_type == "stockTransaction" && product._ref == $id && status == "pending"]),
              "pendingBills": count(*[_type == "bill" && items[].product._ref == $id && status in ["draft", "confirmed", "in_progress"]]),
              "completedTransactions": count(*[_type == "stockTransaction" && product._ref == $id && status == "completed"]),
              "allBillItems": count(*[_type == "bill" && items[].product._ref == $id])
            }`,
            { id }
          );

          if (!productInfo) {
            errors.push(`Product ${id} not found`);
            continue;
          }

          // Check for blocking references
          if (productInfo.activeTransactions > 0) {
            errors.push(
              `Cannot delete ${productInfo.name}: Has ${productInfo.activeTransactions} pending transactions`
            );
            continue;
          }

          if (productInfo.pendingBills > 0) {
            errors.push(
              `Cannot delete ${productInfo.name}: Has ${productInfo.pendingBills} pending bills`
            );
            continue;
          }

          // Create audit trail transaction before deletion
          let auditTransactionId = null;
          if (productInfo.inventory.currentStock > 0) {
            try {
              const transactionId = `del_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;

              const auditTransaction = await sanityClient.create({
                _type: "stockTransaction",
                transactionId,
                type: "adjustment",
                product: { _type: "reference", _ref: id },
                quantity: productInfo.inventory.currentStock,
                unitPrice: 0,
                totalAmount: 0,
                notes: `DELETION AUDIT: Product "${productInfo.name}" removed from inventory. Final stock: ${productInfo.inventory.currentStock}`,
                status: "completed",
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });

              auditTransactionId = auditTransaction._id;
            } catch (auditError) {
              console.warn(
                `Failed to create audit trail for ${id}:`,
                auditError
              );
              // Continue with deletion even if audit fails
            }
          }

          // Attempt to delete the product with retry logic
          let deleteSuccess = false;
          let deleteAttempts = 0;
          const maxAttempts = 3;

          while (!deleteSuccess && deleteAttempts < maxAttempts) {
            try {
              deleteAttempts++;

              // Use transaction to ensure atomicity
              const transaction = sanityClient.transaction();

              // Delete the product
              transaction.delete(id);

              // Commit the transaction
              await transaction.commit();

              deleteSuccess = true;

              results.push({
                productId: id,
                productName: productInfo.name,
                finalStock: productInfo.inventory.currentStock,
                auditTransactionId,
                deleted: true,
                attempts: deleteAttempts,
              });
            } catch (deleteError) {
              console.warn(
                `Delete attempt ${deleteAttempts} failed for ${id}:`,
                deleteError
              );

              if (deleteAttempts >= maxAttempts) {
                // Check if it's a 409 conflict error
                if (
                  deleteError instanceof Error &&
                  deleteError.message.includes("409")
                ) {
                  errors.push(
                    `Cannot delete ${productInfo.name}: Product is referenced by other documents. Please remove all references first.`
                  );
                } else {
                  errors.push(
                    `Failed to delete ${
                      productInfo.name
                    } after ${maxAttempts} attempts: ${
                      deleteError instanceof Error
                        ? deleteError.message
                        : "Unknown error"
                    }`
                  );
                }
              } else {
                // Wait before retry
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * deleteAttempts)
                );
              }
            }
          }
        } catch (error) {
          console.error(`Error processing product ${id}:`, error);
          errors.push(
            `Failed to process product ${id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          deleted: results,
          errors,
          totalDeleted: results.length,
          totalErrors: errors.length,
          summary: {
            attempted: idsToDelete.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        error:
          errors.length > 0
            ? `${errors.length} of ${idsToDelete.length} deletions failed`
            : undefined,
      };
    } catch (error) {
      console.error("Delete operation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete products",
      };
    }
  },

  /**
   * Soft delete product(s) by marking them as deleted
   * This is safer than hard deletion and avoids 409 conflicts
   */
  async softDeleteProduct(
    productId: string,
    deleteConsolidated: boolean = false,
    consolidatedIds?: string[]
  ): Promise<InventoryApiResponse> {
    try {
      const idsToDelete =
        deleteConsolidated && consolidatedIds ? consolidatedIds : [productId];

      const results = [];
      const errors = [];

      for (const id of idsToDelete) {
        try {
          // Get product info
          const product = await sanityClient.fetch(
            `*[_type == "product" && _id == $id][0] { 
              _id, 
              name, 
              inventory { currentStock },
              deleted
            }`,
            { id }
          );

          if (!product) {
            errors.push(`Product ${id} not found`);
            continue;
          }

          if (product.deleted) {
            errors.push(`Product ${product.name} is already deleted`);
            continue;
          }

          // Create audit trail transaction
          let auditTransactionId = null;
          if (product.inventory.currentStock > 0) {
            try {
              const transactionId = `soft_del_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;

              const auditTransaction = await sanityClient.create({
                _type: "stockTransaction",
                transactionId,
                type: "adjustment",
                product: { _type: "reference", _ref: id },
                quantity: product.inventory.currentStock,
                unitPrice: 0,
                totalAmount: 0,
                notes: `SOFT DELETE: Product "${product.name}" marked as deleted. Stock at deletion: ${product.inventory.currentStock}`,
                status: "completed",
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });

              auditTransactionId = auditTransaction._id;
            } catch (auditError) {
              console.warn(
                `Failed to create audit trail for ${id}:`,
                auditError
              );
            }
          }

          // Mark product as deleted and clear stock
          const updateResult = await sanityClient
            .patch(id)
            .set({
              deleted: true,
              deletedAt: new Date().toISOString(),
              "inventory.currentStock": 0,
              "inventory.lastStockUpdate": new Date().toISOString(),
            })
            .commit();

          results.push({
            productId: id,
            productName: product.name,
            originalStock: product.inventory.currentStock,
            auditTransactionId,
            softDeleted: true,
            deletedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error soft deleting product ${id}:`, error);
          errors.push(
            `Failed to soft delete product ${id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          softDeleted: results,
          errors,
          totalDeleted: results.length,
          totalErrors: errors.length,
          summary: {
            attempted: idsToDelete.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        error:
          errors.length > 0
            ? `${errors.length} of ${idsToDelete.length} soft deletions failed`
            : undefined,
      };
    } catch (error) {
      console.error("Soft delete operation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to soft delete products",
      };
    }
  },

  /**
   * Restore soft deleted product(s)
   */
  async restoreProduct(productId: string): Promise<InventoryApiResponse> {
    try {
      // Get product info
      const product = await sanityClient.fetch(
        `*[_type == "product" && _id == $productId][0] { 
          _id, 
          name, 
          deleted,
          deletedAt
        }`,
        { productId }
      );

      if (!product) {
        return {
          success: false,
          error: "Product not found",
        };
      }

      if (!product.deleted) {
        return {
          success: false,
          error: "Product is not deleted",
        };
      }

      // Restore the product
      await sanityClient
        .patch(productId)
        .unset(["deleted", "deletedAt"])
        .set({
          "inventory.lastStockUpdate": new Date().toISOString(),
        })
        .commit();

      // Create restoration audit trail
      const transactionId = `restore_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await sanityClient.create({
        _type: "stockTransaction",
        transactionId,
        type: "adjustment",
        product: { _type: "reference", _ref: productId },
        quantity: 0,
        unitPrice: 0,
        totalAmount: 0,
        notes: `RESTORE: Product "${product.name}" restored from soft delete`,
        status: "completed",
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          productId,
          productName: product.name,
          restoredAt: new Date().toISOString(),
          originalDeletedAt: product.deletedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to restore product",
      };
    }
  },

  /**
   * Check what references exist for a product before deletion
   */
  async checkProductReferences(productId: string): Promise<
    InventoryApiResponse<{
      canDelete: boolean;
      references: {
        activeTransactions: number;
        pendingBills: number;
        completedTransactions: number;
        allBills: number;
      };
      blockingReasons: string[];
    }>
  > {
    try {
      const references = await sanityClient.fetch(
        `{
          "activeTransactions": count(*[_type == "stockTransaction" && product._ref == $productId && status == "pending"]),
          "pendingBills": count(*[_type == "bill" && items[].product._ref == $productId && status in ["draft", "confirmed", "in_progress"]]),
          "completedTransactions": count(*[_type == "stockTransaction" && product._ref == $productId && status == "completed"]),
          "allBills": count(*[_type == "bill" && items[].product._ref == $productId])
        }`,
        { productId }
      );

      const blockingReasons = [];

      if (references.activeTransactions > 0) {
        blockingReasons.push(
          `${references.activeTransactions} pending transactions`
        );
      }

      if (references.pendingBills > 0) {
        blockingReasons.push(`${references.pendingBills} pending bills`);
      }

      const canDelete = blockingReasons.length === 0;

      return {
        success: true,
        data: {
          canDelete,
          references,
          blockingReasons,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to check references",
      };
    }
  },

  /**
   * Force delete a product by removing references (use with caution)
   */
  async forceDeleteProduct(productId: string): Promise<InventoryApiResponse> {
    try {
      // Get product info
      const product = await sanityClient.fetch(
        `*[_type == "product" && _id == $productId][0] { name }`,
        { productId }
      );

      if (!product) {
        return {
          success: false,
          error: "Product not found",
        };
      }

      // Create a transaction to handle all operations
      const transaction = sanityClient.transaction();

      // Delete all related stock transactions
      const stockTransactions = await sanityClient.fetch(
        `*[_type == "stockTransaction" && product._ref == $productId]._id`,
        { productId }
      );

      stockTransactions.forEach((id: string) => {
        transaction.delete(id);
      });

      // Note: We don't delete bills, but we could remove the product references from bill items
      // This is more complex and might require updating bill totals

      // Delete the product itself
      transaction.delete(productId);

      // Commit all changes
      await transaction.commit();

      return {
        success: true,
        data: {
          productName: product.name,
          deletedTransactions: stockTransactions.length,
          message: `Force deleted product "${product.name}" and ${stockTransactions.length} related transactions`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to force delete product",
      };
    }
  },

  /**
   * Bulk update stock levels
   */
  async bulkUpdateStock(
    updates: Array<{
      productId: string;
      newStock: number;
      reason?: string;
    }>
  ): Promise<InventoryApiResponse> {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          // Get current stock
          const currentProduct = await sanityClient.fetch(
            `*[_type == "product" && _id == $productId][0] {
              inventory { currentStock },
              pricing { sellingPrice }
            }`,
            { productId: update.productId }
          );

          if (!currentProduct) {
            errors.push(`Product ${update.productId} not found`);
            continue;
          }

          const stockDifference =
            update.newStock - currentProduct.inventory.currentStock;

          // Update product stock
          await sanityClient
            .patch(update.productId)
            .set({
              "inventory.currentStock": update.newStock,
              "inventory.lastStockUpdate": new Date().toISOString(),
            })
            .commit();

          // Create stock transaction
          if (stockDifference !== 0) {
            const transactionId = `txn_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            await sanityClient.create({
              _type: "stockTransaction",
              transactionId,
              type: "adjustment",
              product: { _type: "reference", _ref: update.productId },
              quantity: Math.abs(stockDifference),
              unitPrice: currentProduct.pricing.sellingPrice,
              totalAmount:
                Math.abs(stockDifference) * currentProduct.pricing.sellingPrice,
              notes:
                update.reason ||
                `Bulk stock adjustment: ${
                  stockDifference > 0 ? "increased" : "decreased"
                } by ${Math.abs(stockDifference)}`,
              status: "completed",
              transactionDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }

          results.push({
            productId: update.productId,
            oldStock: currentProduct.inventory.currentStock,
            newStock: update.newStock,
            difference: stockDifference,
          });
        } catch (error) {
          errors.push(
            `Failed to update ${update.productId}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          updated: results,
          errors,
        },
        error:
          errors.length > 0 ? `${errors.length} updates failed` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk update stock",
      };
    }
  },
};
