import { TAX_RATE } from "../constants/defaults";
import { sanityClient } from "./sanity";
import { createStockTransactionRecord } from "./stock-transaction-router";

export interface BulkInventoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BulkProductData {
  name: string;
  description?: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  specifications: any;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    unit: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
  };
  tags: string[];
  initialStockTransaction?: {
    type: "purchase" | "sale" | "adjustment" | "return" | "damage";
    quantity: number;
    unitPrice: number;
    notes?: string;
  };
  createdBy?: { id?: string; name?: string };
}

export const bulkInventoryApi = {
  // Bulk create multiple products
  async createBulkProducts(productsData: BulkProductData[]): Promise<BulkInventoryApiResponse<{
    successful: any[];
    failed: Array<{ product: any; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }>> {
    try {
      const results: {
        successful: Array<{ name: string; productId: string; inventory: BulkProductData["inventory"]; pricing: BulkProductData["pricing"] }>;
        failed: Array<{ product: BulkProductData; error: string }>;
        summary: { total: number; successful: number; failed: number };
      } = {
        successful: [],
        failed: [],
        summary: {
          total: productsData.length,
          successful: 0,
          failed: 0,
        },
      };

      // Process products individually but efficiently
      const productPromises = productsData.map(async (productData, index) => {
        try {
          const productId = Buffer.from(
            Date.now().toString() + Math.random().toString() + index.toString()
          )
            .toString("base64")
            .substring(0, 12);

          const newProduct = {
            _type: "product",
            productId,
            name: productData.name + ' - ' + productData.brandName,
            slug: {
              _type: "slug",
              current: (
                (productData.name + ' ' + productData.brandName)
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "") + '-' +
                productId.toLowerCase().replace(/[^a-z0-9-]/g, "")
              ),
            },
            description: productData.description,
            brand: { _type: "reference", _ref: productData.brandId },
            category: { _type: "reference", _ref: productData.categoryId },
            specifications: productData.specifications,
            pricing: {
              ...productData.pricing,
              taxRate: TAX_RATE,
            },
            inventory: productData.inventory,
            images: [],
            isActive: true,
            isFeatured: false,
            tags: productData.tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Create the product
          const createdProduct = await sanityClient.create(newProduct);

          // Create stock transaction if needed
          if (productData.initialStockTransaction && productData.initialStockTransaction.quantity > 0) {
            const stockTransactionId = Buffer.from(
              Date.now().toString() + Math.random().toString() + index.toString()
            )
              .toString("base64")
              .substring(0, 12);

            const txResult = await createStockTransactionRecord({
              _type: "stockTransaction",
              transactionId: stockTransactionId,
              type: productData.initialStockTransaction.type,
              product: { _type: "reference", _ref: createdProduct._id },
              quantity: productData.initialStockTransaction.quantity,
              unitPrice: productData.initialStockTransaction.unitPrice,
              totalAmount:
                productData.initialStockTransaction.quantity *
                productData.initialStockTransaction.unitPrice,
              notes:
                productData.initialStockTransaction.notes ||
                `Bulk creation: ${productData.name} - initial stock added`,
              status: "completed",
              transactionDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              createdBy: productData.createdBy?.name,
              createdByName: productData.createdBy?.name,
              createdById: productData.createdBy?.id,
            });
            if (!txResult.success) {
              throw new Error(
                txResult.error || "Failed to create stock transaction"
              );
            }
          }

          return {
            success: true,
            product: {
              name: productData.name,
              productId,
              inventory: productData.inventory,
              pricing: productData.pricing,
            },
          };
        } catch (error) {
          const err: any = error as any;
          const detailedMessage =
            err?.response?.body?.error?.description ||
            err?.response?.body?.message ||
            err?.message ||
            "Unknown error";
          return {
            success: false,
            product: productData,
            error: detailedMessage,
          };
        }
      });

      // Wait for all products to be processed
      const productResults = await Promise.allSettled(productPromises);

      // Process results
      productResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.successful.push(result.value.product);
            results.summary.successful++;
          } else {
            results.failed.push({
              product: result.value.product as BulkProductData,
              error: result.value.error as string,
            });
            results.summary.failed++;
          }
        } else {
          results.failed.push({
            // When Promise rejected before building payload, include a minimal placeholder
            product: productsData[0],
            error: (result as any).reason?.message || "Promise rejected",
          });
          results.summary.failed++;
        }
      });

      return {
        success: results.summary.failed === 0,
        data: results,
        error: results.summary.failed > 0 
          ? `${results.summary.failed} of ${results.summary.total} products failed to create`
          : undefined,
      };
    } catch (error) {
      console.error("Error in bulk product creation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create products in bulk",
      };
    }
  },
};
