import { sanityClient } from "./sanity";

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
      reorderLevel?: number;
      location?: string;
    }
  ): Promise<InventoryApiResponse> {
    try {
      const result = await sanityClient
        .patch(productId)
        .set({
          inventory: inventoryUpdate,
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
  }): Promise<InventoryApiResponse> {
    try {
      const productId = Buffer.from(
        Date.now().toString() + Math.random().toString()
      )
        .toString("base64")
        .substring(0, 12);

      const newProduct = {
        _type: "product",
        productId,
        name: productData.name,
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
          taxRate: 18, // Default GST rate
        },
        inventory: productData.inventory,
        images: [],
        isActive: true,
        isFeatured: false,
        tags: productData.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await sanityClient.create(newProduct);
      return { success: true, data: result };
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
    updateData: any
  ): Promise<InventoryApiResponse> {
    try {
      const result = await sanityClient
        .patch(productId)
        .set({
          ...updateData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

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
  }): Promise<InventoryApiResponse> {
    try {
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
      };

      const result = await sanityClient.create(newTransaction);

      // Update product inventory based on transaction type
      const stockChange = ["sale", "damage"].includes(transactionData.type)
        ? -transactionData.quantity
        : transactionData.quantity;

      await sanityClient
        .patch(transactionData.productId)
        .inc({ "inventory.currentStock": stockChange })
        .set({ updatedAt: new Date().toISOString() })
        .commit();

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
};
