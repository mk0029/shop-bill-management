import { create } from "zustand";
import { inventoryApi, stockApi } from "@/lib/inventory-api";
import { useSanityRealtimeStore } from "./sanity-realtime-store";
import { generateEnhancedProductName } from "@/lib/product-naming";

export interface Specification {
  [key: string]: string | number | boolean | string[] | undefined;
}

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
  specifications: Specification;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    standardPrice?: number;
    modularPrice?: number;
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
  deleted?: boolean;
  deletedAt?: string;
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
  products: Product[];
  stockTransactions: StockTransaction[];
  inventorySummary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  fetchProducts: (filters?: any) => Promise<void>;
  fetchProductById: (productId: string) => Promise<Product | null>;
  fetchLowStockProducts: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchInventorySummary: () => Promise<void>;
  fetchStockTransactions: (filters?: any) => Promise<void>;
  searchProducts: (searchTerm: string, limit?: number) => Promise<Product[]>;
  updateProductInventory: (
    productId: string,
    inventoryUpdate: Partial<Product["inventory"] & Product["pricing"]>
  ) => Promise<boolean>;
  createStockTransaction: (
    transactionData: Partial<StockTransaction>
  ) => Promise<boolean>;
  findExistingProduct: (productData: {
    brandId: string;
    categoryId: string;
    specifications: Specification;
  }) => Product | undefined;
  addOrUpdateProduct: (productData: {
    name: string;
    description?: string;
    brandId: string;
    categoryId: string;
    specifications: Specification;
    pricing: { purchasePrice: number; sellingPrice: number; unit: string };
    inventory: {
      currentStock: number;
      minimumStock: number;
      reorderLevel: number;
    };
    tags: string[];
  }) => Promise<{
    success: boolean;
    data?: Product;
    error?: string;
    isUpdate?: boolean;
  }>;
  handleRealtimeProductUpdate: (product: Product) => void;
  handleRealtimeStockTransaction: (transaction: StockTransaction) => void;
  getProductsByCategory: (categoryName: string) => Product[];
  getProductsByBrand: (brandName: string) => Product[];
  getLowStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
  getFeaturedProducts: () => Product[];
  getProductById: (productId: string) => Product | undefined;
  getConsolidatedProducts: () => Product[];
  softDeleteProduct: (productId: string) => Promise<boolean>;
  restoreProduct: (productId: string) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  clearError: () => void;
  refreshData: () => Promise<void>;
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
  handleBillCreated: (bill: any) => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  stockTransactions: [],
  inventorySummary: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchProducts: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getProducts(filters);
      if (response.success) {
        set({
          products: (response.data as Product[]) || [],
          isLoading: false,
          lastFetched: new Date(),
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch products",
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  },

  fetchProductById: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getProductById(productId);
      if (response.success) {
        set({ isLoading: false });
        return response.data as Product;
      } else {
        set({ isLoading: false, error: response.error || "Product not found" });
        return null;
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return null;
    }
  },

  fetchLowStockProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getLowStockProducts();
      if (response.success) {
        set({ products: (response.data as Product[]) || [], isLoading: false });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch low stock products",
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  },

  fetchFeaturedProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getFeaturedProducts();
      if (response.success) {
        const featuredProducts = (response.data as Product[]) || [];
        set((state) => ({
          products: state.products.map(
            (p) => featuredProducts.find((fp) => fp._id === p._id) || p
          ),
          isLoading: false,
        }));
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch featured products",
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  },

  fetchInventorySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getInventorySummary();
      if (response.success) {
        set({
          inventorySummary: response.data as InventorySummary,
          isLoading: false,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch inventory summary",
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  },

  fetchStockTransactions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await stockApi.getStockTransactions(filters);
      if (response.success) {
        set({
          stockTransactions: (response.data as StockTransaction[]) || [],
          isLoading: false,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch stock transactions",
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  },

  searchProducts: async (searchTerm, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.searchProducts(searchTerm, limit);
      set({ isLoading: false });
      if (response.success) {
        return (response.data as Product[]) || [];
      } else {
        set({ error: response.error || "Failed to search products" });
        return [];
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return [];
    }
  },

  updateProductInventory: async (productId, inventoryUpdate) => {
    try {
      const response = await inventoryApi.updateProductInventory(
        productId,
        inventoryUpdate
      );
      if (response.success) {
        set((state) => ({
          products: state.products.map((p) =>
            p._id === productId
              ? { ...p, inventory: { ...p.inventory, ...inventoryUpdate } }
              : p
          ),
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to update inventory" });
        return false;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return false;
    }
  },

  createStockTransaction: async (transactionData) => {
    try {
      const response = await stockApi.createStockTransaction(transactionData);
      if (response.success) {
        get().fetchStockTransactions();
        get().fetchInventorySummary();
        return true;
      } else {
        set({ error: response.error || "Failed to create transaction" });
        return false;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return false;
    }
  },

  findExistingProduct: (productData) => {
    const { products } = get();
    return products.find((product) => {
      if (
        product.brand._id !== productData.brandId ||
        product.category._id !== productData.categoryId
      ) {
        return false;
      }
      const existingSpecs = product.specifications;
      const newSpecs = productData.specifications;
      const allKeys = new Set([
        ...Object.keys(existingSpecs),
        ...Object.keys(newSpecs),
      ]);
      for (const key of allKeys) {
        if (existingSpecs[key] !== newSpecs[key]) {
          return false;
        }
      }
      return true;
    });
  },

  addOrUpdateProduct: async (productData) => {
    const { findExistingProduct, updateProductInventory } = get();
    const existingProduct = findExistingProduct(productData);

    if (existingProduct) {
      const newStock =
        existingProduct.inventory.currentStock +
        productData.inventory.currentStock;
      await updateProductInventory(existingProduct._id, {
        currentStock: newStock,
        purchasePrice: productData.pricing.purchasePrice,
        sellingPrice: productData.pricing.sellingPrice,
      });
      return {
        success: true,
        data: {
          ...existingProduct,
          inventory: { ...existingProduct.inventory, currentStock: newStock },
        },
        isUpdate: true,
      };
    }

    try {
      const response = await inventoryApi.createProduct(productData);
      if (response.success) {
        const newProduct = response.data as Product;
        set((state) => ({ products: [...state.products, newProduct] }));
        await get().fetchInventorySummary();
        await get().createStockTransaction({
          productId: newProduct._id,
          type: "purchase",
          quantity: productData.inventory.currentStock,
          unitPrice: productData.pricing.purchasePrice,
          notes: `Initial stock for ${generateEnhancedProductName(newProduct)}`,
        });
        return { success: true, data: newProduct, isUpdate: false };
      } else {
        set({ error: response.error || "Failed to create product" });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  handleRealtimeProductUpdate: (product) => {
    set((state) => ({
      products: state.products.map((p) =>
        p._id === product._id ? { ...p, ...product } : p
      ),
    }));
    get().fetchInventorySummary();
  },

  handleRealtimeStockTransaction: (transaction) => {
    set((state) => ({
      stockTransactions: [transaction, ...state.stockTransactions],
    }));
    const { products } = get();
    const productIndex = products.findIndex(
      (p) => p._id === transaction.product._id
    );
    if (productIndex > -1) {
      const updatedProducts = [...products];
      const productToUpdate = updatedProducts[productIndex];
      let newStock = productToUpdate.inventory.currentStock;
      if (["sale", "damage"].includes(transaction.type)) {
        newStock -= transaction.quantity;
      } else if (["purchase", "return"].includes(transaction.type)) {
        newStock += transaction.quantity;
      }
      updatedProducts[productIndex] = {
        ...productToUpdate,
        inventory: { ...productToUpdate.inventory, currentStock: newStock },
      };
      set({ products: updatedProducts });
    }
  },

  getProductsByCategory: (categoryName) =>
    get().products.filter(
      (p) => p.category.name.toLowerCase() === categoryName.toLowerCase()
    ),
  getProductsByBrand: (brandName) =>
    get().products.filter(
      (p) => p.brand.name.toLowerCase() === brandName.toLowerCase()
    ),
  getLowStockProducts: () =>
    get().products.filter(
      (p) =>
        p.isActive &&
        !p.deleted &&
        p.inventory.currentStock <= p.inventory.minimumStock
    ),
  getOutOfStockProducts: () =>
    get().products.filter(
      (p) => p.isActive && !p.deleted && p.inventory.currentStock <= 0
    ),
  getFeaturedProducts: () =>
    get().products.filter((p) => p.isActive && !p.deleted && p.isFeatured),
  getProductById: (productId) =>
    get().products.find((p) => p._id === productId),

  getConsolidatedProducts: () => {
    const { products } = get();
    const activeProducts = products.filter((p) => !p.deleted);
    const groupedProducts = new Map<string, Product[]>();

    activeProducts.forEach((product) => {
      const key = `${generateEnhancedProductName(
        product
      ).toLowerCase()}-${JSON.stringify(product.specifications)}`;
      if (!groupedProducts.has(key)) {
        groupedProducts.set(key, []);
      }
      groupedProducts.get(key)!.push(product);
    });

    const consolidatedProducts: Product[] = [];
    groupedProducts.forEach((group) => {
      if (group.length === 1) {
        consolidatedProducts.push(group[0]);
      } else {
        const latest = group.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        const totalStock = group.reduce(
          (sum, p) => sum + p.inventory.currentStock,
          0
        );
        const consolidated: Product = {
          ...latest,
          inventory: { ...latest.inventory, currentStock: totalStock },
          _consolidated: {
            totalEntries: group.length,
            originalIds: group.map((p) => p._id),
            latestPriceUpdate: latest.updatedAt,
          },
        };
        consolidatedProducts.push(consolidated);
      }
    });
    return consolidatedProducts;
  },

  softDeleteProduct: async (productId) => {
    try {
      const response = await inventoryApi.updateProduct(productId, {
        deleted: true,
      });
      if (response.success) {
        set((state) => ({
          products: state.products.map((p) =>
            p._id === productId
              ? { ...p, deleted: true, deletedAt: new Date().toISOString() }
              : p
          ),
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to soft delete product" });
        return false;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return false;
    }
  },

  restoreProduct: async (productId) => {
    try {
      const response = await inventoryApi.updateProduct(productId, {
        deleted: false,
      });
      if (response.success) {
        set((state) => ({
          products: state.products.map((p) =>
            p._id === productId
              ? { ...p, deleted: false, deletedAt: undefined }
              : p
          ),
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to restore product" });
        return false;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return false;
    }
  },

  deleteProduct: async (productId) => {
    try {
      const response = await inventoryApi.deleteProduct(productId);
      if (response.success) {
        set((state) => ({
          products: state.products.filter((p) => p._id !== productId),
        }));
        return true;
      } else {
        set({
          error: response.error || "Failed to permanently delete product",
        });
        return false;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  initializeRealtime: () => {
    const { on } = useSanityRealtimeStore.getState();
    on("bill:created", (bill) => get().handleBillCreated(bill));
    on("inventory:updated", ({ productId, updates }) =>
      get().handleRealtimeProductUpdate({
        _id: productId,
        ...updates,
      } as Product)
    );
    on("inventory:low_stock", (data) =>
      console.log(`Low stock alert: ${data.productName}`)
    );
  },

  cleanupRealtime: () => {
    const { off } = useSanityRealtimeStore.getState();
    off("bill:created");
    off("inventory:updated");
    off("inventory:low_stock");
  },

  handleBillCreated: (bill) => {
    bill.items?.forEach(async (item: unknown) => {
      const { products, createStockTransaction } = get();
      const product = products.find((p) => p._id === item.product);
      if (product) {
        const newStock = product.inventory.currentStock - item.quantity;
        set((state) => ({
          products: state.products.map((p) =>
            p._id === item.product
              ? { ...p, inventory: { ...p.inventory, currentStock: newStock } }
              : p
          ),
        }));
        await createStockTransaction({
          productId: item.product,
          type: "sale",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          billId: bill._id,
          notes: `Sold via bill ${bill.billNumber}`,
        });
      }
    });
    get().fetchInventorySummary();
  },

  refreshData: async () => {
    const { fetchProducts, fetchInventorySummary } = get();
    await Promise.all([fetchProducts(), fetchInventorySummary()]);
  },
}));
