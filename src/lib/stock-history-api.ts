/**
 * Stock History API Service
 * Provides functions to fetch real stock transaction data from Sanity
 */

import { sanityClient } from "./sanity";
import { StockTransaction } from "@/types";

export interface StockHistoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StockHistoryFilters {
  productId?: string;
  type?: "purchase" | "sale" | "adjustment" | "return" | "damage";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface StockHistorySummary {
  totalTransactions: number;
  totalPurchases: number;
  totalSales: number;
  totalPurchaseAmount: number;
  totalSalesAmount: number;
  netProfit: number;
}

// Debug function to check database content
export const debugStockHistory = async () => {
  try {
    console.log("🔍 DEBUG: Checking database content...");

    // Check all stock transactions
    const allTransactions =
      await sanityClient.fetch(`*[_type == "stockTransaction"] {
      _id,
      type,
      transactionId,
      deleted,
      product->{
        _id,
        name,
        isActive,
        deleted
      }
    }`);

    console.log("🔍 All transactions in DB:", allTransactions.length);
    console.log("🔍 Sample transactions:", allTransactions.slice(0, 3));

    // Check products
    const allProducts = await sanityClient.fetch(`*[_type == "product"] {
      _id,
      name,
      isActive,
      deleted
    }`);

    console.log("🔍 All products in DB:", allProducts.length);
    console.log(
      "🔍 Active products:",
      allProducts.filter((p) => p.isActive && !p.deleted).length
    );

    return { allTransactions, allProducts };
  } catch (error) {
    console.error("🔍 Debug error:", error);
    return null;
  }
};

export const stockHistoryApi = {
  /**
   * Get stock transactions with filters
   */
  async getStockTransactions(
    filters?: StockHistoryFilters
  ): Promise<StockHistoryApiResponse<StockTransaction[]>> {
    try {
      let query = `*[_type == "stockTransaction"`;
      const params: Record<string, unknown> = {};

      // Apply filters
      if (filters?.productId) {
        query += ` && product._ref == $productId`;
        params.productId = filters.productId;
      }

      if (filters?.type) {
        query += ` && type == $type`;
        params.type = filters.type;
      }

      if (filters?.dateFrom) {
        query += ` && transactionDate >= $dateFrom`;
        params.dateFrom = filters.dateFrom;
      }

      if (filters?.dateTo) {
        query += ` && transactionDate <= $dateTo`;
        params.dateTo = filters.dateTo;
      }

      if (filters?.search) {
        query += ` && (product->name match $search || notes match $search || transactionId match $search)`;
        params.search = `*${filters.search}*`;
      }

      query += `] {
        _id,
        transactionId,
        type,
        product->{
          _id,
          name,
          productId,
          isActive,
          deleted
        },
        quantity,
        unitPrice,
        totalAmount,
        supplier->{name},
        bill->{billNumber},
        notes,
        status,
        transactionDate,
        createdAt,
        "createdBy": "admin"
      } | order(transactionDate desc)`;

      console.log("🔍 Stock transactions query:", query);
      console.log("🔍 Query params:", params);

      const transactions = await sanityClient.fetch(query, params);

      console.log("🔍 Raw transactions from DB:", transactions.length);
      console.log("🔍 Sample transaction:", transactions[0]);

      // Filter out unwanted transactions
      const filteredTransactions = transactions.filter((t: any) => {
        // Filter out soft delete transactions
        if (t.notes && t.notes.includes("SOFT DELETE")) {
          console.log("🔍 Filtering out soft delete transaction:", t._id);
          return false;
        }

        // Filter out transactions with deleted products
        if (t.product && t.product.deleted === true) {
          console.log(
            "🔍 Filtering out transaction with deleted product:",
            t._id,
            t.product.name
          );
          return false;
        }

        // Filter out transactions with inactive products
        if (t.product && t.product.isActive !== true) {
          console.log(
            "🔍 Filtering out transaction with inactive product:",
            t._id,
            t.product.name,
            "isActive:",
            t.product.isActive
          );
          return false;
        }

        // Filter out transactions without valid product references
        if (!t.product || !t.product._id) {
          console.log("🔍 Filtering out transaction with no product:", t._id);
          return false;
        }

        return true;
      });

      console.log("🔍 Filtered transactions:", filteredTransactions.length);

      // Transform to match StockTransaction interface
      const transformedTransactions: StockTransaction[] =
        filteredTransactions.map((t: any) => ({
          id: t._id,
          itemId: t.product?._id || "",
          itemName: t.product?.name || "Unknown Product",
          type: t.type,
          quantity: t.quantity,
          price: t.unitPrice,
          totalAmount: t.totalAmount,
          date: new Date(t.transactionDate),
          notes: t.notes,
          createdBy: t.createdBy || "admin",
        }));

      console.log(
        "🔍 Transformed transactions:",
        transformedTransactions.length
      );
      return { success: true, data: transformedTransactions };
    } catch (error) {
      console.error("Error fetching stock transactions:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stock transactions",
      };
    }
  },

  /**
   * Get stock history summary statistics
   */
  async getStockHistorySummary(
    filters?: StockHistoryFilters
  ): Promise<StockHistoryApiResponse<StockHistorySummary>> {
    try {
      let query = `{
        "allTransactions": *[_type == "stockTransaction"`;
      const params: Record<string, unknown> = {};

      // Apply same filters as main query
      if (filters?.productId) {
        query += ` && product._ref == $productId`;
        params.productId = filters.productId;
      }

      if (filters?.type) {
        query += ` && type == $type`;
        params.type = filters.type;
      }

      if (filters?.dateFrom) {
        query += ` && transactionDate >= $dateFrom`;
        params.dateFrom = filters.dateFrom;
      }

      if (filters?.dateTo) {
        query += ` && transactionDate <= $dateTo`;
        params.dateTo = filters.dateTo;
      }

      if (filters?.search) {
        query += ` && (product->name match $search || notes match $search || transactionId match $search)`;
        params.search = `*${filters.search}*`;
      }

      query += ` && defined(product->_id)] {
          type,
          quantity,
          unitPrice,
          totalAmount,
          notes,
          product->{
            isActive,
            deleted
          }
        }
      }`;

      console.log("🔍 Summary query:", query);
      console.log("🔍 Summary params:", params);

      const result = await sanityClient.fetch(query, params);
      const transactions = result.allTransactions || [];

      console.log("🔍 Summary raw transactions:", transactions.length);
      console.log("🔍 Sample summary transaction:", transactions[0]);

      // Filter out unwanted transactions (same logic as main query)
      const filteredTransactions = transactions.filter((t: any) => {
        // Filter out soft delete transactions
        if (t.notes && t.notes.includes("SOFT DELETE")) {
          return false;
        }

        // Filter out transactions with deleted products
        if (t.product && t.product.deleted === true) {
          return false;
        }

        // Filter out transactions with inactive products
        if (t.product && t.product.isActive !== true) {
          return false;
        }

        return true;
      });

      console.log(
        "🔍 Summary filtered transactions:",
        filteredTransactions.length
      );

      // Calculate summary statistics
      let totalTransactions = 0;
      let totalPurchases = 0;
      let totalSales = 0;
      let totalPurchaseAmount = 0;
      let totalSalesAmount = 0;

      filteredTransactions.forEach((t: unknown) => {
        totalTransactions++;

        if (t.type === "purchase") {
          totalPurchases++;
          totalPurchaseAmount += t.totalAmount || 0;
        } else if (t.type === "sale") {
          totalSales++;
          totalSalesAmount += t.totalAmount || 0;
        }
      });

      const netProfit = totalSalesAmount - totalPurchaseAmount;

      const summary: StockHistorySummary = {
        totalTransactions,
        totalPurchases,
        totalSales,
        totalPurchaseAmount,
        totalSalesAmount,
        netProfit,
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error("Error fetching stock history summary:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch summary",
      };
    }
  },

  /**
   * Get stock transaction by ID
   */
  async getStockTransactionById(
    transactionId: string
  ): Promise<StockHistoryApiResponse<StockTransaction>> {
    try {
      const query = `*[_type == "stockTransaction" && _id == $transactionId && !defined(deleted)][0] {
        _id,
        transactionId,
        type,
        product->[!defined(deleted) && isActive == true]{
          _id,
          name,
          productId
        },
        quantity,
        unitPrice,
        totalAmount,
        supplier->{name},
        bill->{billNumber},
        notes,
        status,
        transactionDate,
        createdAt,
        "createdBy": "admin"
      }`;

      const transaction = await sanityClient.fetch(query, { transactionId });

      if (!transaction || !transaction.product) {
        return {
          success: false,
          error: "Transaction not found or product is deleted",
        };
      }

      // Transform to match StockTransaction interface
      const transformedTransaction: StockTransaction = {
        id: transaction._id,
        itemId: transaction.product?._id || "",
        itemName: transaction.product?.name || "Unknown Product",
        type: transaction.type,
        quantity: transaction.quantity,
        price: transaction.unitPrice,
        totalAmount: transaction.totalAmount,
        date: new Date(transaction.transactionDate),
        notes: transaction.notes,
        createdBy: transaction.createdBy || "admin",
      };

      return { success: true, data: transformedTransaction };
    } catch (error) {
      console.error("Error fetching stock transaction:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transaction",
      };
    }
  },

  /**
   * Get recent stock transactions (last 50)
   */
  async getRecentTransactions(): Promise<
    StockHistoryApiResponse<StockTransaction[]>
  > {
    try {
      const query = `*[_type == "stockTransaction" && !defined(deleted)] {
        _id,
        transactionId,
        type,
        product->[!defined(deleted) && isActive == true]{
          _id,
          name,
          productId
        },
        quantity,
        unitPrice,
        totalAmount,
        supplier->{name},
        bill->{billNumber},
        notes,
        status,
        transactionDate,
        createdAt,
        "createdBy": "admin"
      }[defined(product._id)] | order(transactionDate desc)[0...50]`;

      const transactions = await sanityClient.fetch(query);

      // Transform to match StockTransaction interface
      const transformedTransactions: StockTransaction[] = transactions.map(
        (t: unknown) => ({
          id: t._id,
          itemId: t.product?._id || "",
          itemName: t.product?.name || "Unknown Product",
          type: t.type,
          quantity: t.quantity,
          price: t.unitPrice,
          totalAmount: t.totalAmount,
          date: new Date(t.transactionDate),
          notes: t.notes,
          createdBy: t.createdBy || "admin",
        })
      );

      return { success: true, data: transformedTransactions };
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch recent transactions",
      };
    }
  },

  /**
   * Get stock transactions for a specific product
   */
  async getProductTransactions(
    productId: string,
    limit: number = 20
  ): Promise<StockHistoryApiResponse<StockTransaction[]>> {
    try {
      const query = `*[_type == "stockTransaction" && product._ref == $productId && !defined(deleted)] {
        _id,
        transactionId,
        type,
        product->[!defined(deleted) && isActive == true]{
          _id,
          name,
          productId
        },
        quantity,
        unitPrice,
        totalAmount,
        supplier->{name},
        bill->{billNumber},
        notes,
        status,
        transactionDate,
        createdAt,
        "createdBy": "admin"
      }[defined(product._id)] | order(transactionDate desc)[0...$limit]`;

      const transactions = await sanityClient.fetch(query, {
        productId,
        limit: limit - 1,
      });

      // Transform to match StockTransaction interface
      const transformedTransactions: StockTransaction[] = transactions.map(
        (t: unknown) => ({
          id: t._id,
          itemId: t.product?._id || "",
          itemName: t.product?.name || "Unknown Product",
          type: t.type,
          quantity: t.quantity,
          price: t.unitPrice,
          totalAmount: t.totalAmount,
          date: new Date(t.transactionDate),
          notes: t.notes,
          createdBy: t.createdBy || "admin",
        })
      );

      return { success: true, data: transformedTransactions };
    } catch (error) {
      console.error("Error fetching product transactions:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product transactions",
      };
    }
  },
};
