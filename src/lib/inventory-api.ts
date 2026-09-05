import { TAX_RATE } from "../constants/defaults";
import { sanityClient } from "./sanity";
import { createStockTransactionRecord } from "./stock-transaction-router";

export interface InventoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Product API functions
export const inventoryApi = {
  // Get all products with filters
  async getProducts(filters?: {
    category?: string;
    brand?: string;
    isActive?: boolean;
    search?: string;
    includeDeleted?: boolean;
  }): Promise<InventoryApiResponse> {
    try {
      let query = `*[_type == "product"`;
      const params: Record<string, unknown> = {};

      // Filter out deleted products by default
      if (!filters?.includeDeleted) {
        query += ` && !defined(deleted)`;
      }

      if (filters?.category) {
        query += ` && category->name match $category`;
        params.category = filters.category;
      }

      if (filters?.brand) {
        query += ` && brand->name match $brand`;
        params.brand = filters.brand;
      }

      if (filters?.isActive !== undefined) {
        query += ` && isActive == $isActive`;
        params.isActive = filters.isActive;
      }

      if (filters?.search) {
        query += ` && (name match $search || description match $search)`;
        params.search = `*${filters.search}*`;
      }

      query += `] {
        _id,
        productId,
        name,
        slug,
        description,
        brand->{
          _id,
          name,
          slug,
          logo
        },
        category->{
          _id,
          name,
          slug,
          icon
        },
        specifications,
        pricing,
        inventory,
        images,
        isActive,
        isFeatured,
        tags,
        deleted,
        deletedAt,
        createdAt,
        updatedAt
      } | order(name asc)`;

      const products = await sanityClient.fetch(query, params);
      return { success: true, data: products };
    } catch (error) {
      console.error("Error fetching products:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      };
    }
  },

  // Get product by ID
  async getProductById(productId: string): Promise<InventoryApiResponse> {
    try {
      const query = `*[_type == "product" && _id == $productId][0] {
        _id,
        productId,
        name,
        slug,
        description,
        brand->{
          _id,
          name,
          slug,
          logo,
          contactInfo
        },
        category->{
          _id,
          name,
          slug,
          icon,
          description
        },
        specifications,
        pricing,
        inventory,
        images,
        isActive,
        isFeatured,
        tags,
        seoTitle,
        seoDescription,
        createdAt,
        updatedAt
      }`;

      const product = await sanityClient.fetch(query, { productId });

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      return { success: true, data: product };
    } catch (error) {
      console.error("Error fetching product:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch product",
      };
    }
  },

  // Get low stock products
  async getLowStockProducts(): Promise<InventoryApiResponse> {
    try {
      const query = `*[_type == "product" && isActive == true && inventory.currentStock <= inventory.minimumStock] {
        _id,
        productId,
        name,
        brand->{name},
        category->{name},
        inventory,
        pricing
      } | order(inventory.currentStock asc)`;

      const products = await sanityClient.fetch(query);
      return { success: true, data: products };
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch low stock products",
      };
    }
  },

  // Get featured products
  async getFeaturedProducts(): Promise<InventoryApiResponse> {
    try {
      const query = `*[_type == "product" && isActive == true && isFeatured == true] {
        _id,
        productId,
        name,
        slug,
        description,
        brand->{name, logo},
        category->{name, icon},
        pricing,
        inventory,
        images
      } | order(name asc)`;

      const products = await sanityClient.fetch(query);
      return { success: true, data: products };
    } catch (error) {
      console.error("Error fetching featured products:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch featured products",
      };
    }
  },

  // Update product inventory
  async updateProductInventory(
    productId: string,
    inventoryUpdate: {
      currentStock?: number;
      minimumStock?: number;
      maximumStock?: number;
    }
  ): Promise<InventoryApiResponse> {
    try {
      const result = await sanityClient
        .patch(productId)
        .set({
          "inventory.currentStock": inventoryUpdate.currentStock,
          "inventory.minimumStock": inventoryUpdate.minimumStock,
          "inventory.maximumStock": inventoryUpdate.maximumStock,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating product inventory:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update inventory",
      };
    }
  },

  // Get inventory summary
  async getInventorySummary(): Promise<InventoryApiResponse> {
    try {
      // Fetch all products' purchasePrice and currentStock
      const query = `{
        "lowStockProducts": count(*[_type == "product" && isActive == true && inventory.currentStock <= inventory.minimumStock]),
        "outOfStockProducts": count(*[_type == "product" && isActive == true && inventory.currentStock <= 0]),
        "products": *[_type == "product" && isActive == true]{
          "purchasePrice": pricing.purchasePrice,
          "currentStock": inventory.currentStock
        },
        "categories": count(*[_type == "category" && isActive == true]),
        "brands": count(*[_type == "brand" && isActive == true])
      }`;

      const summary = await sanityClient.fetch(query);
      // Calculate totalItems and totalValue from products array
      const totalItems = Array.isArray(summary.products)
        ? summary.products.reduce(
            (sum: number, p: { currentStock: number }) =>
              sum + (p.currentStock || 0),
            0
          )
        : 0;
      const totalValue = Array.isArray(summary.products)
        ? summary.products.reduce(
            (sum: number, p: { purchasePrice: number; currentStock: number }) =>
              sum + (p.purchasePrice || 0) * (p.currentStock || 0),
            0
          )
        : 0;
      return { success: true, data: { ...summary, totalItems, totalValue } };
    } catch (error) {
      console.error("Error fetching inventory summary:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inventory summary",
      };
    }
  },

  // Search products
  async searchProducts(
    searchTerm: string,
    limit: number = 10
  ): Promise<InventoryApiResponse> {
    try {
      const query = `*[_type == "product" && isActive == true && (
        name match $searchTerm ||
        description match $searchTerm ||
        brand->name match $searchTerm ||
        category->name match $searchTerm ||
        tags[] match $searchTerm
      )][0...$limit] {
        _id,
        productId,
        name,
        brand->{name},
        category->{name},
        pricing,
        inventory,
        images[0]
      }`;

      const products = await sanityClient.fetch(query, {
        searchTerm: `*${searchTerm}*`,
        limit: limit - 1,
      });

      return { success: true, data: products };
    } catch (error) {
      console.error("Error searching products:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search products",
      };
    }
  },

  // Create new product
  async createProduct(productData: {
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
  }): Promise<InventoryApiResponse> {
    try {
      const actorUserId = String(productData?.createdBy?.id || '').trim()
      if (!actorUserId) {
        return { success: false, error: 'Missing actorUserId' }
      }

      const res = await fetch('/api/mutations/inventory/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorUserId, product: productData }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to create product' }
      }
      return { success: true, data: json?.data }
    } catch (error) {
      console.error("Error creating product:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create product",
      };
    }
  },

  // Update existing product
  async updateProduct(
    productId: string,
    updateData: unknown
  ): Promise<InventoryApiResponse> {
    try {
      const safeUpdate = (typeof updateData === 'object' && updateData !== null)
        ? (updateData as Record<string, unknown>)
        : {}
      const { catalogUpdate } = await import("@/lib/catalog-mutations");
      const result = await catalogUpdate("product", productId, {
        ...safeUpdate,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating product:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update product",
      };
    }
  },

  // Update product details (name, pricing, and add stock)
  async updateProductDetails(
    productId: string,
    details: {
      name: string;
      pricing: { purchasePrice?: number; sellingPrice?: number };
      stockToAdd: number;
    }
  ): Promise<InventoryApiResponse> {
    try {
      const { name, pricing, stockToAdd } = details;

      // Read current inventory so we can apply the stock increment via a set.
      let currentStock = 0;
      try {
        const existing = await sanityClient.fetch<{ inventory?: { currentStock?: number } } | null>(
          `*[_type == "product" && _id == $id][0]{ inventory{currentStock} }`,
          { id: productId }
        );
        currentStock = Number(existing?.inventory?.currentStock || 0);
      } catch {}

      const { catalogUpdate } = await import("@/lib/catalog-mutations");
      const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (name) patch.name = name;
      if (pricing.purchasePrice) patch["pricing.purchasePrice"] = pricing.purchasePrice;
      if (pricing.sellingPrice) patch["pricing.sellingPrice"] = pricing.sellingPrice;
      if (stockToAdd > 0) patch["inventory.currentStock"] = Math.max(0, currentStock + stockToAdd);

      const result = await catalogUpdate("product", productId, patch);

      // If stock was added, create a stock transaction record
      if (stockToAdd > 0) {
        // Determine effective unitPrice: prefer provided pricing.purchasePrice, else fetch current product price
        let effectiveUnitPrice = typeof pricing.purchasePrice === 'number' ? pricing.purchasePrice : 0;
        let productNameForLog: string | undefined;
        if (!(effectiveUnitPrice > 0)) {
          const productDoc = await sanityClient.fetch(
            `*[_type == "product" && _id == $id][0]{ _id, name, pricing{purchasePrice} }`,
            { id: productId }
          );
          productNameForLog = productDoc?.name as string | undefined;
          const fetchedPrice = Number(productDoc?.pricing?.purchasePrice || 0);
          if (isFinite(fetchedPrice) && fetchedPrice > 0) {
            effectiveUnitPrice = fetchedPrice;
          }
        }

        await stockApi.createStockTransaction({
          productId,
          type: "adjustment",
          quantity: stockToAdd,
          unitPrice: effectiveUnitPrice || 0,
          notes: "Stock updated from inventory edit popup",
          updateInventory: false, // Inventory is already updated by the patch
        });

        // Also create a corresponding cash book debit entry so the cash book reflects this edit flow
        try {
          const totalAmount = (effectiveUnitPrice || 0) * stockToAdd;
          if (totalAmount > 0) {
            // Ensure product name for display
            if (!productNameForLog) {
              const product = await sanityClient.fetch(
                `*[_type == "product" && _id == $id][0]{ _id, name }`,
                { id: productId }
              );
              productNameForLog = product?.name as string | undefined;
            }
            const { sanityApiService } = await import("@/lib/sanity-api-service");
            await sanityApiService.cashBook.createEntry({
              userName: productNameForLog || "Inventory Item",
              amount: totalAmount,
              type: "debit",
              source: "Inventory",
              category: "inventory",
              notes: `Inventory adjustment: ${stockToAdd} units at ₹${effectiveUnitPrice || 0} each (Edit popup)`,
            });
          }
        } catch (cashErr) {
          // Non-blocking: do not fail product update if cash book entry fails
          console.warn("Failed to create cash book entry for inventory edit flow:", cashErr);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating product details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product details",
      };
    }
  },

  // Bulk create multiple products
  async createBulkProducts(productsData: Array<{
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
  }>): Promise<InventoryApiResponse<{
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
        successful: any[];
        failed: Array<{ product: any; error: string }>;
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

      // Use Sanity transaction for better performance and atomicity
      const transaction = sanityClient.transaction();
      const stockTransactions: any[] = [];
      const createdProducts: Array<{ data: any; originalData: any }> = [];

      for (const productData of productsData) {
        try {
          const productId = Buffer.from(
            Date.now().toString() + Math.random().toString()
          )
            .toString("base64")
            .substring(0, 12);

          const docId = `product_${productId}_${Math.random().toString(36).slice(2, 8)}`;

          const newProduct = {
            _id: docId,
            _type: "product",
            productId,
            name: productData.name + ' - ' + productData.brandName,
            slug: {
              _type: "slug",
              current: productData.name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
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
            images: productData.images || [],
            isActive: true,
            isFeatured: false,
            tags: productData.tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Add to transaction
          transaction.create(newProduct);
          createdProducts.push({ data: newProduct, originalData: productData });

          results.successful.push({
            name: productData.name,
            productId,
            inventory: productData.inventory,
            pricing: productData.pricing,
          });
          results.summary.successful++;
        } catch (error) {
          results.failed.push({
            product: productData,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          results.summary.failed++;
        }
      }

      // Commit all products in a single transaction
      if (createdProducts.length > 0) {
        await transaction.commit();

        const stockPromises = createdProducts.map(async ({ data: createdProduct, originalData }) => {
          if (originalData?.initialStockTransaction) {
            try {
              const stockTransactionId = Buffer.from(
                Date.now().toString() + Math.random().toString()
              )
                .toString("base64")
                .substring(0, 12);

              const createdTxn = await createStockTransactionRecord({
                _type: "stockTransaction",
                transactionId: stockTransactionId,
                type: originalData.initialStockTransaction.type,
                product: { _type: "reference", _ref: createdProduct._id },
                quantity: originalData.initialStockTransaction.quantity,
                unitPrice: originalData.initialStockTransaction.unitPrice,
                totalAmount:
                  originalData.initialStockTransaction.quantity *
                  originalData.initialStockTransaction.unitPrice,
                notes:
                  originalData.initialStockTransaction.notes ||
                  `Bulk creation: ${originalData.name} - initial stock added`,
                status: "completed",
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                createdBy: originalData.createdBy?.name,
                createdByName: originalData.createdBy?.name,
                createdById: originalData.createdBy?.id,
              });
              if (!createdTxn.success) {
                throw new Error(
                  createdTxn.error || "Failed to create stock transaction"
                );
              }

              // Create corresponding cash book debit entry for the initial stock
              try {
                const isInventoryAddition = ["purchase", "adjustment"].includes(
                  originalData.initialStockTransaction.type
                );
                const totalAmount =
                  originalData.initialStockTransaction.quantity *
                  originalData.initialStockTransaction.unitPrice;
                if (isInventoryAddition && totalAmount > 0) {
                  const { sanityApiService } = await import("@/lib/sanity-api-service");
                  await sanityApiService.cashBook.createEntry({
                    userName: (createdProduct as any)?.name || originalData.name || "Inventory Item",
                    amount: totalAmount,
                    type: "debit",
                    source: "Inventory",
                    category: "inventory",
                    notes: `Inventory ${originalData.initialStockTransaction.type}: ${originalData.initialStockTransaction.quantity} units at ₹${originalData.initialStockTransaction.unitPrice} each (Transaction ID: ${stockTransactionId})`,
                  });
                }
              } catch (cashErr) {
                console.warn("Failed to create cash book entry for initial stock:", cashErr);
              }

              return createdTxn;
            } catch (error) {
              console.warn(`Failed to create stock transaction for product ${createdProduct._id}:`, error);
              return null;
            }
          }
          return null;
        });

        await Promise.allSettled(stockPromises);
      }

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

// Stock Transaction API functions
export const stockApi = {
  // Get stock transactions
  async getStockTransactions(filters?: {
    productId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<InventoryApiResponse> {
    try {
      let query = `*[_type == "stockTransaction"`;
      const params: Record<string, unknown> = {};

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

      query += `] {
        _id,
        transactionId,
        type,
        product->{
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
        createdAt
      } | order(transactionDate desc)`;

      const transactions = await sanityClient.fetch(query, params);
      return { success: true, data: transactions };
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

  // Create stock transaction
  async createStockTransaction(transactionData: {
    productId: string;
    type: "purchase" | "sale" | "adjustment" | "return" | "damage";
    quantity: number;
    unitPrice: number;
    supplierId?: string;
    billId?: string;
    notes?: string;
    updateInventory?: boolean; // New parameter to control inventory update
    createdBy?: { id?: string; name?: string };
  }): Promise<InventoryApiResponse> {
    try {
      // Validate required fields
      if (
        !transactionData.productId ||
        typeof transactionData.productId !== "string"
      ) {
        console.error("❌ Invalid productId:", transactionData.productId);
        return {
          success: false,
          error: "Valid product ID is required for stock transaction",
        };
      }

      if (
        !transactionData.type ||
        !["purchase", "sale", "adjustment", "return", "damage"].includes(
          transactionData.type
        )
      ) {
        console.error("❌ Invalid transaction type:", transactionData.type);
        return {
          success: false,
          error: "Valid transaction type is required",
        };
      }

      if (!transactionData.quantity || transactionData.quantity <= 0) {
        console.error("❌ Invalid quantity:", transactionData.quantity);
        return {
          success: false,
          error: "Quantity must be greater than 0",
        };
      }
      const transactionId = Buffer.from(
        Date.now().toString() + Math.random().toString()
      )
        .toString("base64")
        .substring(0, 12);

      const newTransaction = {
        _type: "stockTransaction",
        transactionId,
        type: transactionData.type,
        product: { _type: "reference", _ref: transactionData.productId },
        quantity: transactionData.quantity,
        unitPrice: transactionData.unitPrice,
        totalAmount: transactionData.quantity * transactionData.unitPrice,
        supplier: transactionData.supplierId
          ? { _type: "reference", _ref: transactionData.supplierId }
          : undefined,
        bill: transactionData.billId
          ? { _type: "reference", _ref: transactionData.billId }
          : undefined,
        notes: transactionData.notes,
        status: "completed",
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: transactionData.createdBy?.name,
        createdByName: transactionData.createdBy?.name,
        createdById: transactionData.createdBy?.id,
      };

      const txResult = await createStockTransactionRecord(newTransaction);
      if (!txResult.success) {
        throw new Error(
          txResult.error || "Failed to create stock transaction"
        );
      }
      const result = { _id: txResult.id, ...newTransaction } as any;

      // Update product inventory based on transaction type (only if updateInventory is true)
      if (transactionData.updateInventory !== false) {
        const stockChange = ["sale", "damage"].includes(transactionData.type)
          ? -transactionData.quantity
          : transactionData.quantity;

        await sanityClient
          .patch(transactionData.productId)
          .inc({ "inventory.currentStock": stockChange })
          .set({ updatedAt: new Date().toISOString() })
          .commit();
      }
      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating stock transaction:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock transaction",
      };
    }
  },

  // Bulk create multiple products
  async createBulkProducts(productsData: Array<{
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
  }>): Promise<InventoryApiResponse<{
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
        successful: any[];
        failed: Array<{ product: any; error: string }>;
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

      // Use Sanity transaction for better performance and atomicity
      const transaction = sanityClient.transaction();
      const createdProducts: Array<{ data: any; originalData: any }> = [];

      for (const productData of productsData) {
        try {
          const productId = Buffer.from(
            Date.now().toString() + Math.random().toString()
          )
            .toString("base64")
            .substring(0, 12);

          const docId = `product_${productId}_${Math.random().toString(36).slice(2, 8)}`;

          const newProduct = {
            _id: docId,
            _type: "product",
            productId,
            name: productData.name + ' - ' + productData.brandName,
            slug: {
              _type: "slug",
              current: productData.name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
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

          // Add to transaction
          transaction.create(newProduct);
          createdProducts.push({ data: newProduct, originalData: productData });

          results.successful.push({
            name: productData.name,
            productId,
            inventory: productData.inventory,
            pricing: productData.pricing,
          });
          results.summary.successful++;
        } catch (error) {
          results.failed.push({
            product: productData,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          results.summary.failed++;
        }
      }

      // Commit all products in a single transaction
      if (createdProducts.length > 0) {
        await transaction.commit();

        const stockPromises = createdProducts.map(async ({ data: createdProduct, originalData }) => {
          if (originalData?.initialStockTransaction) {
            try {
              const stockTransactionId = Buffer.from(
                Date.now().toString() + Math.random().toString()
              )
                .toString("base64")
                .substring(0, 12);

              const createdTxn = await createStockTransactionRecord({
                _type: "stockTransaction",
                transactionId: stockTransactionId,
                type: originalData.initialStockTransaction.type,
                product: { _type: "reference", _ref: createdProduct._id },
                quantity: originalData.initialStockTransaction.quantity,
                unitPrice: originalData.initialStockTransaction.unitPrice,
                totalAmount:
                  originalData.initialStockTransaction.quantity *
                  originalData.initialStockTransaction.unitPrice,
                notes:
                  originalData.initialStockTransaction.notes ||
                  `Bulk creation: ${originalData.name} - initial stock added`,
                status: "completed",
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                createdBy: originalData.createdBy?.name,
                createdByName: originalData.createdBy?.name,
                createdById: originalData.createdBy?.id,
              });
              if (!createdTxn.success) {
                throw new Error(
                  createdTxn.error || "Failed to create stock transaction"
                );
              }

              try {
                const isInventoryAddition = ["purchase", "adjustment"].includes(
                  originalData.initialStockTransaction.type
                );
                const totalAmount =
                  originalData.initialStockTransaction.quantity *
                  originalData.initialStockTransaction.unitPrice;
                if (isInventoryAddition && totalAmount > 0) {
                  const { sanityApiService } = await import("@/lib/sanity-api-service");
                  await sanityApiService.cashBook.createEntry({
                    userName:
                      (createdProduct as any)?.name ||
                      originalData.name ||
                      "Inventory Item",
                    amount: totalAmount,
                    type: "debit",
                    source: "Inventory",
                    category: "inventory",
                    notes: `Inventory ${originalData.initialStockTransaction.type}: ${originalData.initialStockTransaction.quantity} units at ₹${originalData.initialStockTransaction.unitPrice} each (Transaction ID: ${stockTransactionId})`,
                  });
                }
              } catch (cashErr) {
                console.warn(
                  "Failed to create cash book entry for initial stock:",
                  cashErr,
                );
              }

              return createdTxn;
            } catch (error) {
              console.warn(
                `Failed to create stock transaction for product ${createdProduct._id}:`,
                error,
              );
              return null;
            }
          }
          return null;
        });

        await Promise.allSettled(stockPromises);
      }

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
