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

  // Getters
  getProductsByCategory: (categoryName: string) => Product[];
  getProductsByBrand: (brandName: string) => Product[];
  getLowStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
  getFeaturedProducts: () => Product[];
  getProductById: (productId: string) => Product | undefined;

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

  // Utilities
  clearError: () => {
    set({ error: null });
  },

  refreshData: async () => {
    const { fetchProducts, fetchInventorySummary } = get();
    await Promise.all([fetchProducts(), fetchInventorySummary()]);
  },
}));
