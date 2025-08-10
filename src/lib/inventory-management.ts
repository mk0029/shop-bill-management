/**
 * Enhanced Inventory Management System
 * Handles real-time stock updates, price fetching, and stock validation
 */

import { sanityClient } from "./sanity";

export interface StockValidationResult {
  isValid: boolean;
  availableStock: number;
  requestedQuantity: number;
  productName: string;
  error?: string;
}

export interface PriceInfo {
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  lastUpdated: string;
}

export interface StockUpdateResult {
  success: boolean;
  newStock: number;
  transactionId?: string;
  error?: string;
}

export interface InventoryValueBreakdownItem {
  productId: string;
  name: string;
  brand: string;
  stock: number;
  unitPrice: number;
  totalValue: number;
  unit: string;
}

export interface BillItem {
  productId?: string;
  quantity: number;
  unitPrice?: number; // Will be fetched if not provided
}

/**
 * Validate stock availability for multiple items
 */
export async function validateStockAvailability(items: BillItem[]): Promise<{
  isValid: boolean;
  validationResults: StockValidationResult[];
  errors: string[];
}> {
  try {
    const productIds = items.map((item) => item.productId);

    // Fetch current stock for all products in one query
    const query = `*[_type == "product" && _id in $productIds] {
      _id,
      name,
      inventory {
        currentStock,
        minimumStock
      },
      pricing {
        sellingPrice,
        unit
      }
    }`;

    const products = await sanityClient.fetch(query, { productIds });

    const validationResults: StockValidationResult[] = [];
    const errors: string[] = [];
    let isValid = true;

    for (const item of items) {
      const product = products.find((p: any) => p._id === item.productId);

      if (!product) {
        const result: StockValidationResult = {
          isValid: false,
          availableStock: 0,
          requestedQuantity: item.quantity,
          productName: "Unknown Product",
          error: "Product not found",
        };
        validationResults.push(result);
        errors.push(`Product with ID ${item.productId} not found`);
        isValid = false;
        continue;
      }

      const availableStock = product.inventory.currentStock;
      const requestedQuantity = item.quantity;
      const hasEnoughStock = availableStock >= requestedQuantity;

      const result: StockValidationResult = {
        isValid: hasEnoughStock,
        availableStock,
        requestedQuantity,
        productName: product.name,
        error: hasEnoughStock
          ? undefined
          : `Insufficient stock. Available: ${availableStock}, Requested: ${requestedQuantity}`,
      };

      validationResults.push(result);

      if (!hasEnoughStock) {
        errors.push(
          `${product.name}: Insufficient stock (Available: ${availableStock}, Requested: ${requestedQuantity})`
        );
        isValid = false;
      }
    }

    return {
      isValid,
      validationResults,
      errors,
    };
  } catch (error) {
    console.error("Error validating stock availability:", error);
    return {
      isValid: false,
      validationResults: [],
      errors: ["Failed to validate stock availability"],
    };
  }
}

/**
 * Fetch latest prices for products
 */
export async function fetchLatestPrices(
  productIds: string[]
): Promise<Map<string, PriceInfo>> {
  try {
    const query = `*[_type == "product" && _id in $productIds] {
      _id,
      pricing {
        purchasePrice,
        sellingPrice,
        unit
      },
      updatedAt
    }`;

    const products = await sanityClient.fetch(query, { productIds });
    const priceMap = new Map<string, PriceInfo>();

    products.forEach((product: any) => {
      priceMap.set(product._id, {
        purchasePrice: product.pricing.purchasePrice,
        sellingPrice: product.pricing.sellingPrice,
        unit: product.pricing.unit,
        lastUpdated: product.updatedAt,
      });
    });

    return priceMap;
  } catch (error) {
    console.error("Error fetching latest prices:", error);
    return new Map();
  }
}

/**
 * Update stock for multiple products atomically
 */
export async function updateStockForBill(
  items: BillItem[],
  billId: string,
  operation: "reduce" | "restore" = "reduce"
): Promise<{
  success: boolean;
  results: StockUpdateResult[];
  errors: string[];
}> {
  try {
    // First validate stock availability (only for reduce operation)
    if (operation === "reduce") {
      const validation = await validateStockAvailability(items);
      if (!validation.isValid) {
        return {
          success: false,
          results: [],
          errors: validation.errors,
        };
      }
    }

    const results: StockUpdateResult[] = [];
    const errors: string[] = [];
    const transactions = [];

    // Process each item
    for (const item of items) {
      if (!item.productId) {
        const errorMsg = "Skipping stock update for item without a productId.";
        console.warn(errorMsg);
        errors.push(errorMsg);
        results.push({ success: false, newStock: 0, error: errorMsg });
        continue;
      }

      try {
        const multiplier = operation === "reduce" ? -1 : 1;
        const stockChange = item.quantity * multiplier;

        // Update product stock
        const updateResult = await sanityClient
          .patch(item.productId)
          .inc({ "inventory.currentStock": stockChange })
          .set({ "inventory.lastStockUpdate": new Date().toISOString() })
          .commit();

        // Get updated stock level
        const updatedProduct = await sanityClient.fetch(
          `*[_type == "product" && _id == $productId][0] {
            inventory { currentStock },
            name,
            pricing { sellingPrice }
          }`,
          { productId: item.productId }
        );

        // Create stock transaction record
        const transactionId = `txn_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const stockTransaction = {
          _type: "stockTransaction",
          transactionId,
          type: operation === "reduce" ? "sale" : "return",
          product: { _type: "reference", _ref: item.productId },
          quantity: Math.abs(stockChange),
          unitPrice: item.unitPrice || updatedProduct.pricing.sellingPrice,
          totalAmount:
            Math.abs(stockChange) *
            (item.unitPrice || updatedProduct.pricing.sellingPrice),
          bill: { _type: "reference", _ref: billId },
          notes: `Stock ${
            operation === "reduce" ? "reduced" : "restored"
          } for bill ${billId}`,
          status: "completed",
          transactionDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        const transactionResult = await sanityClient.create(stockTransaction);
        transactions.push(transactionResult);

        results.push({
          success: true,
          newStock: updatedProduct.inventory.currentStock,
          transactionId: transactionResult._id,
        });
      } catch (error) {
        console.error(
          `Error updating stock for product ${item.productId}:`,
          error
        );
        errors.push(`Failed to update stock for product ${item.productId}`);
        results.push({
          success: false,
          newStock: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const success = results.every((r) => r.success);

    return {
      success,
      results,
      errors,
    };
  } catch (error) {
    console.error("Error in updateStockForBill:", error);
    return {
      success: false,
      results: [],
      errors: ["Failed to update stock"],
    };
  }
}

/**
 * Get stock history for a product
 */
export async function getStockHistory(
  productId: string,
  limit: number = 50
): Promise<{
  success: boolean;
  history: any[];
  error?: string;
}> {
  try {
    const query = `*[_type == "stockTransaction" && product._ref == $productId] | order(transactionDate desc)[0...$limit] {
      _id,
      transactionId,
      type,
      quantity,
      unitPrice,
      totalAmount,
      bill->{
        billNumber,
        customer->{name}
      },
      notes,
      transactionDate,
      createdAt
    }`;

    const history = await sanityClient.fetch(query, {
      productId,
      limit: limit - 1,
    });

    return {
      success: true,
      history,
    };
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return {
      success: false,
      history: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch stock history",
    };
  }
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(): Promise<{
  success: boolean;
  alerts: any[];
  error?: string;
}> {
  try {
    const query = `*[_type == "product" && isActive == true && inventory.currentStock <= inventory.minimumStock] {
      _id,
      name,
      brand->{name},
      inventory {
        currentStock,
        minimumStock,
        reorderLevel
      },
      pricing {
        sellingPrice,
        unit
      }
    } | order(inventory.currentStock asc)`;

    const alerts = await sanityClient.fetch(query);

    return {
      success: true,
      alerts,
    };
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    return {
      success: false,
      alerts: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch low stock alerts",
    };
  }
}

/**
 * Calculate total inventory value
 */
export async function calculateInventoryValue(): Promise<{
  success: boolean;
  totalValue: number;
  totalItems: number;
  breakdown: InventoryValueBreakdownItem[];
  error?: string;
}> {
  try {
    const query = `*[_type == "product" && isActive == true] {
      _id,
      name,
      brand->{name},
      inventory {
        currentStock
      },
      pricing {
        purchasePrice,
        sellingPrice,
        unit
      }
    }`;

    const products = await sanityClient.fetch(query);

    let totalValue = 0;
    let totalItems = 0;
    const breakdown: InventoryValueBreakdownItem[] = [];

    products.forEach((product: any) => {
      const stock = product.inventory.currentStock;
      const value = stock * product.pricing.purchasePrice;

      totalItems += stock;
      totalValue += value;

      if (stock > 0) {
        breakdown.push({
          productId: product._id,
          name: product.name,
          brand: product.brand?.name || "Unknown",
          stock,
          unitPrice: product.pricing.purchasePrice,
          totalValue: value,
          unit: product.pricing.unit,
        });
      }
    });

    return {
      success: true,
      totalValue,
      totalItems,
      breakdown: breakdown.sort((a, b) => b.totalValue - a.totalValue),
    };
  } catch (error) {
    console.error("Error calculating inventory value:", error);
    return {
      success: false,
      totalValue: 0,
      totalItems: 0,
      breakdown: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate inventory value",
    };
  }
}
