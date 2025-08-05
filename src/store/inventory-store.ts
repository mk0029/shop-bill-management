import { create } from "zustand";
import { inventoryApi, stockApi } from "@/lib/inventory-api";

export interface Product {
  _id: string;
  productId: string;
  name: string;
  slug: { current: string };
  description?: string;
  brand: {
    _id: string;
    name: string;
    slug: { current: string };
    logo?: any;
  };
  category: {
    _id: string;
    name: string;
    slug: { current: string };
    icon?: string;
  };
  specifications: {
    voltage?: string;
    wattage?: number;
    amperage?: string;
    loadCapacity?: number;
    wireGauge?: string;
    lightType?: string;
    color?: string;
    lumens?: number;
    size?: string;
    weight?: number;
    material?: string;
    modal?: string;
    modular?: boolean;
    hasWarranty?: boolean;
    warrantyMonths?: number;
    certifications?: string[];
  };
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    standardPrice?: number;
    modularPrice?: number;
    mrp?: number;
    discount?: number;
    taxRate: number;
    unit: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock?: number;
    reorderLevel: number;
    location?: string;
    lastStockUpdate?: string;
  };
  images: any[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  // Optional property for consolidated products
  _consolidated?: {
    totalEntries: number;
    originalIds: string[];
    latestPriceUpdate: string;
  };
}

export interface StockTransaction {
  _id: string;
  transactionId: string;
  type: "purchase" | "sale" | "adjustment" | "return" | "damage";
  product: {
    _id: string;
    name: string;
    productId: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplier?: { name: string };
  bill?: { billNumber: string };
  notes?: string;
  status: string;
  transactionDate: string;
  createdAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  categories: number;
  brands: number;
}

interface InventoryStore {
  // State
  products: Product[];
  stockTransactions: StockTransaction[];
  inventorySummary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  fetchProducts: (filters?: any) => Promise<void>;
  fetchProductById: (productId: string) => Promise<Product | null>;
  fetchLowStockProducts: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchInventorySummary: () => Promise<void>;
  fetchStockTransactions: (filters?: any) => Promise<void>;
  searchProducts: (searchTerm: string, limit?: number) => Promise<Product[]>;
  updateProductInventory: (
    productId: string,
    inventoryUpdate: any
  ) => Promise<boolean>;
  createStockTransaction: (transactionData: any) => Promise<boolean>;

  // New methods for handling duplicate products with latest pricing
  findExistingProduct: (productData: {
    brandId: string;
    categoryId: string; // Category ID as per API documentation
    specifications: any;
  }) => Product | undefined;
  addOrUpdateProduct: (productData: {
    name: string;
    description?: string;
    brandId: string;
    categoryId: string; // Category ID as per API documentation
    specifications: unknown;
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
  }) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    isUpdate?: boolean;
  }>;

  // Getters
  getProductsByCategory: (categoryName: string) => Product[];
  getProductsByBrand: (brandName: string) => Product[];
  getLowStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
  getFeaturedProducts: () => Product[];
  getProductById: (productId: string) => Product | undefined;
  getConsolidatedProducts: () => Product[];

  // Utilities
  clearError: () => void;
  refreshData: () => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  // Initial state
  products: [],
  stockTransactions: [],
  inventorySummary: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch all products
  fetchProducts: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await inventoryApi.getProducts(filters);

      if (response.success) {
        set({
          products: response.data || [],
          isLoading: false,
          lastFetched: new Date(),
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch products",
        });
      }
    } catch (error) {
      console.error("Error in fetchProducts:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      });
    }
  },

  // Fetch product by ID
  fetchProductById: async (productId) => {
    try {
      const response = await inventoryApi.getProductById(productId);

      if (response.success) {
        return response.data;
      } else {
        set({ error: response.error || "Product not found" });
        return null;
      }
    } catch (error) {
      console.error("Error in fetchProductById:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch product",
      });
      return null;
    }
  },

  // Fetch low stock products
  fetchLowStockProducts: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await inventoryApi.getLowStockProducts();

      if (response.success) {
        // Update the products array with low stock products
        const { products } = get();
        const lowStockProducts = response.data || [];

        // Merge with existing products or replace if needed
        const updatedProducts = products.map((product) => {
          const lowStockProduct = lowStockProducts.find(
            (p: Product) => p._id === product._id
          );
          return lowStockProduct || product;
        });

        set({
          products: updatedProducts,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch low stock products",
        });
      }
    } catch (error) {
      console.error("Error in fetchLowStockProducts:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch low stock products",
      });
    }
  },

  // Fetch featured products
  fetchFeaturedProducts: async () => {
    try {
      const response = await inventoryApi.getFeaturedProducts();

      if (response.success) {
        // Update products with featured products
        const { products } = get();
        const featuredProducts = response.data || [];

        const updatedProducts = products.map((product) => {
          const featuredProduct = featuredProducts.find(
            (p: Product) => p._id === product._id
          );
          return featuredProduct || product;
        });

        set({ products: updatedProducts });
      } else {
        set({ error: response.error || "Failed to fetch featured products" });
      }
    } catch (error) {
      console.error("Error in fetchFeaturedProducts:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch featured products",
      });
    }
  },

  // Fetch inventory summary
  fetchInventorySummary: async () => {
    try {
      const response = await inventoryApi.getInventorySummary();

      if (response.success) {
        set({ inventorySummary: response.data });
      } else {
        set({ error: response.error || "Failed to fetch inventory summary" });
      }
    } catch (error) {
      console.error("Error in fetchInventorySummary:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inventory summary",
      });
    }
  },

  // Fetch stock transactions
  fetchStockTransactions: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await stockApi.getStockTransactions(filters);

      if (response.success) {
        set({
          stockTransactions: response.data || [],
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch stock transactions",
        });
      }
    } catch (error) {
      console.error("Error in fetchStockTransactions:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stock transactions",
      });
    }
  },

  // Search products
  searchProducts: async (searchTerm, limit = 10) => {
    try {
      const response = await inventoryApi.searchProducts(searchTerm, limit);

      if (response.success) {
        return response.data || [];
      } else {
        set({ error: response.error || "Failed to search products" });
        return [];
      }
    } catch (error) {
      console.error("Error in searchProducts:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to search products",
      });
      return [];
    }
  },

  // Update product inventory
  updateProductInventory: async (productId, inventoryUpdate) => {
    try {
      const response = await inventoryApi.updateProductInventory(
        productId,
        inventoryUpdate
      );

      if (response.success) {
        // Update the product in the local state
        const { products } = get();
        const updatedProducts = products.map((product) =>
          product._id === productId
            ? {
                ...product,
                inventory: { ...product.inventory, ...inventoryUpdate },
              }
            : product
        );

        set({ products: updatedProducts });
        return true;
      } else {
        set({ error: response.error || "Failed to update inventory" });
        return false;
      }
    } catch (error) {
      console.error("Error in updateProductInventory:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to update inventory",
      });
      return false;
    }
  },

  // Create stock transaction
  createStockTransaction: async (transactionData) => {
    try {
      const response = await stockApi.createStockTransaction(transactionData);

      if (response.success) {
        // Refresh stock transactions
        await get().fetchStockTransactions();
        return true;
      } else {
        set({ error: response.error || "Failed to create stock transaction" });
        return false;
      }
    } catch (error) {
      console.error("Error in createStockTransaction:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock transaction",
      });
      return false;
    }
  },

  // Find existing product with same specifications
  findExistingProduct: (productData: {
    brandId: string;
    categoryId: string;
    specifications: unknown;
  }) => {
    const { products } = get();

    console.log("🔍 Looking for existing product with:", {
      brandId: productData.brandId,
      categoryId: productData.categoryId,
      specifications: productData.specifications,
    });

    const existingProduct = products.find((product) => {
      console.log("🔍 Comparing with product:", {
        name: product.name,
        brandId: product.brand._id,
        categoryId: product.category._id,
        specifications: product.specifications,
      });

      // Check if brand and category match
      const brandMatches = product.brand._id === productData.brandId;
      const categoryMatches = product.category._id === productData.categoryId;

      if (!brandMatches || !categoryMatches) {
        console.log("❌ Brand or category mismatch", {
          brandMatches,
          categoryMatches,
        });
        return false;
      }

      // Check if specifications match
      const existingSpecs = product.specifications;
      const newSpecs = productData.specifications;

      // Compare key specifications
      const specsToCompare = [
        "lightType",
        "color",
        "size",
        "watts",
        "wireGauge",
        "amperage",
      ];

      const specsMatch = specsToCompare.every((spec) => {
        const existing = existingSpecs[spec];
        const newValue = newSpecs[spec];

        // Both undefined/null or both have same value
        const match = (!existing && !newValue) || existing === newValue;
        console.log(
          `🔍 Spec ${spec}: existing=${existing}, new=${newValue}, match=${match}`
        );
        return match;
      });

      console.log(`🔍 Specifications match: ${specsMatch}`);
      return specsMatch;
    });

    if (existingProduct) {
      console.log("✅ Found existing product:", existingProduct.name);
    } else {
      console.log("❌ No existing product found");
    }

    return existingProduct;
  },

  // Add or update product with latest price logic
  addOrUpdateProduct: async (productData: {
    name: string;
    description?: string;
    brandId: string;
    categoryId: string;
    specifications: unknown;
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
  }) => {
    try {
      console.log("🚀 Starting addOrUpdateProduct with:", productData);

      // Validate required fields
      if (!productData.brandId || !productData.categoryId) {
        console.error("❌ Missing required fields:", {
          brandId: productData.brandId,
          categoryId: productData.categoryId,
        });
        return {
          success: false,
          error: "Brand ID and Category ID are required",
        };
      }

      const { findExistingProduct } = get();

      // Check if product already exists
      const existingProduct = findExistingProduct({
        brandId: productData.brandId,
        categoryId: productData.categoryId,
        specifications: productData.specifications,
      });

      console.log("🔍 Existing product found:", !!existingProduct);

      if (existingProduct) {
        // Update existing product with new stock and latest prices
        const newTotalStock =
          existingProduct.inventory.currentStock +
          productData.inventory.currentStock;

        const updateData = {
          inventory: {
            ...existingProduct.inventory,
            currentStock: newTotalStock,
            // Update minimum stock if needed
            minimumStock: Math.max(
              existingProduct.inventory.minimumStock,
              productData.inventory.minimumStock
            ),
            reorderLevel: Math.max(
              existingProduct.inventory.reorderLevel,
              productData.inventory.reorderLevel
            ),
          },
          pricing: {
            ...existingProduct.pricing,
            // Use latest prices
            purchasePrice: productData.pricing.purchasePrice,
            sellingPrice: productData.pricing.sellingPrice,
          },
          updatedAt: new Date().toISOString(),
        };

        console.log(
          "🔄 Updating existing product:",
          existingProduct._id,
          updateData
        );
        const response = await inventoryApi.updateProduct(
          existingProduct._id,
          updateData
        );

        console.log("📝 Update response:", response);
        if (response.success) {
          // Update local state
          const { products } = get();
          const updatedProducts = products.map((product) =>
            product._id === existingProduct._id
              ? { ...product, ...updateData }
              : product
          );

          set({ products: updatedProducts });

          // Refresh inventory summary
          await get().fetchInventorySummary();

          // Create stock transaction for the addition
          await get().createStockTransaction({
            productId: existingProduct._id,
            type: "purchase",
            quantity: productData.inventory.currentStock,
            unitPrice: productData.pricing.purchasePrice,
            notes: `Stock updated with latest price. New total: ${newTotalStock} ${productData.pricing.unit}`,
          });

          return {
            success: true,
            data: { ...existingProduct, ...updateData },
            isUpdate: true,
          };
        } else {
          return {
            success: false,
            error: response.error || "Failed to update existing product",
          };
        }
      } else {
        // Create new product
        console.log("🆕 Creating new product:", productData);
        const response = await inventoryApi.createProduct(productData);

        console.log("📝 Create response:", response);
        if (response.success) {
          // Add to local state
          const { products } = get();
          set({ products: [...products, response.data] });

          // Refresh inventory summary
          await get().fetchInventorySummary();

          return { success: true, data: response.data, isUpdate: false };
        } else {
          return {
            success: false,
            error: response.error || "Failed to create product",
          };
        }
      }
    } catch (error) {
      console.error("Error in addOrUpdateProduct:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add or update product",
      };
    }
  },

  // Getters
  getProductsByCategory: (categoryName) => {
    const { products } = get();
    return products.filter(
      (product) =>
        product.category.name.toLowerCase() === categoryName.toLowerCase()
    );
  },

  getProductsByBrand: (brandName) => {
    const { products } = get();
    return products.filter(
      (product) => product.brand.name.toLowerCase() === brandName.toLowerCase()
    );
  },

  getLowStockProducts: () => {
    const { products } = get();
    return products.filter(
      (product) =>
        product.isActive &&
        product.inventory.currentStock <= product.inventory.minimumStock
    );
  },

  getOutOfStockProducts: () => {
    const { products } = get();
    return products.filter(
      (product) => product.isActive && product.inventory.currentStock <= 0
    );
  },

  getFeaturedProducts: () => {
    const { products } = get();
    return products.filter((product) => product.isActive && product.isFeatured);
  },

  getProductById: (productId) => {
    const { products } = get();
    return products.find((product) => product._id === productId);
  },

  // Get consolidated products (group same items with latest prices)
  getConsolidatedProducts: () => {
    const { products } = get();

    // Group products by unique identifier (name + brand + key specifications)
    const groupedProducts = new Map<string, Product[]>();

    products.forEach((product) => {
      // Create a unique key based on name, brand, and key specifications
      const keySpecs = {
        lightType: product.specifications.lightType,
        color: product.specifications.color,
        size: product.specifications.size,
        watts: product.specifications.wattage,
        wireGauge: product.specifications.wireGauge,
        amperage: product.specifications.amperage,
        material: product.specifications.material,
        modal: product.specifications.modal,
      };

      const uniqueKey = `${product.name.toLowerCase()}-${product.brand.name.toLowerCase()}-${JSON.stringify(
        keySpecs
      )}`;

      if (!groupedProducts.has(uniqueKey)) {
        groupedProducts.set(uniqueKey, []);
      }
      groupedProducts.get(uniqueKey)!.push(product);
    });

    // Consolidate each group
    const consolidatedProducts: Product[] = [];

    groupedProducts.forEach((productGroup) => {
      if (productGroup.length === 1) {
        // Single product, no consolidation needed
        consolidatedProducts.push(productGroup[0]);
      } else {
        // Multiple products, consolidate them
        // Sort by updatedAt to get the latest entry for pricing
        const sortedProducts = productGroup.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        const latestProduct = sortedProducts[0];
        const totalStock = productGroup.reduce(
          (sum, p) => sum + p.inventory.currentStock,
          0
        );
        const minStock = Math.max(
          ...productGroup.map((p) => p.inventory.minimumStock)
        );
        const maxStock = Math.max(
          ...productGroup.map((p) => p.inventory.maximumStock || 0)
        );
        const reorderLevel = Math.max(
          ...productGroup.map((p) => p.inventory.reorderLevel)
        );

        // Create consolidated product with latest prices and total stock
        const consolidatedProduct: Product = {
          ...latestProduct,
          inventory: {
            ...latestProduct.inventory,
            currentStock: totalStock,
            minimumStock: minStock,
            maximumStock: maxStock || undefined,
            reorderLevel: reorderLevel,
          },
          // Keep the latest pricing (already from latestProduct)
          pricing: {
            ...latestProduct.pricing,
          },
          // Add a custom property to track that this is consolidated
          _consolidated: {
            totalEntries: productGroup.length,
            originalIds: productGroup.map((p) => p._id),
            latestPriceUpdate: latestProduct.updatedAt,
          } as any,
        };

        consolidatedProducts.push(consolidatedProduct);
      }
    });

    return consolidatedProducts;
  },

  // Utilities
  clearError: () => {
    set({ error: null });
  },

  refreshData: async () => {
    const { fetchProducts, fetchInventorySummary } = get();
    await Promise.all([fetchProducts(), fetchInventorySummary()]);
  },
}));
