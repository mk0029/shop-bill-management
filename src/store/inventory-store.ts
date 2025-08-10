import { create } from "zustand";
import { inventoryApi, stockApi } from "@/lib/inventory-api";
import { useSanityRealtimeStore } from "./sanity-realtime-store";

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
    inventoryUpdate: Partial<Product['inventory'] & Product['pricing']>
  ) => Promise<boolean>;
  createStockTransaction: (transactionData: Partial<StockTransaction>) => Promise<boolean>;
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
    inventory: { currentStock: number; minimumStock: number; reorderLevel: number };
    tags: string[];
  }) => Promise<{ success: boolean; data?: Product; error?: string; isUpdate?: boolean }>;
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
        set({ products: (response.data as Product[]) || [], isLoading: false, lastFetched: new Date() });
      } else {
        set({ isLoading: false, error: response.error || "Failed to fetch products" });
      }
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
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
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
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
        set({ isLoading: false, error: response.error || "Failed to fetch low stock products" });
      }
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  },

  fetchFeaturedProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getFeaturedProducts();
      if (response.success) {
        const featuredProducts = (response.data as Product[]) || [];
        set((state) => ({ 
          products: state.products.map(p => featuredProducts.find(fp => fp._id === p._id) || p),
          isLoading: false 
        }));
      } else {
        set({ isLoading: false, error: response.error || "Failed to fetch featured products" });
      }
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  },

  fetchInventorySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await inventoryApi.getInventorySummary();
      if (response.success) {
        set({ inventorySummary: response.data as InventorySummary, isLoading: false });
      } else {
        set({ isLoading: false, error: response.error || "Failed to fetch inventory summary" });
      }
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  },

  fetchStockTransactions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await stockApi.getStockTransactions(filters);
      if (response.success) {
        set({ stockTransactions: (response.data as StockTransaction[]) || [], isLoading: false });
      } else {
        set({ isLoading: false, error: response.error || "Failed to fetch stock transactions" });
      }
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
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
      set({ isLoading: false, error: error instanceof Error ? error.message : "An unknown error occurred" });
      return [];
    }
  },

  updateProductInventory: async (productId, inventoryUpdate) => {
    try {
      const response = await inventoryApi.updateProductInventory(productId, inventoryUpdate);
      if (response.success) {
        set((state) => ({ 
          products: state.products.map((p) => 
            p._id === productId 
              ? { ...p, inventory: { ...p.inventory, ...inventoryUpdate } } 
              : p
          )
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to update inventory" });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "An unknown error occurred" });
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
      set({ error: error instanceof Error ? error.message : "An unknown error occurred" });
      return false;
    }
  },

  findExistingProduct: (productData) => {
    const { products } = get();
    return products.find((product) => {
      if (product.brand._id !== productData.brandId || product.category._id !== productData.categoryId) {
        return false;
      }
      const existingSpecs = product.specifications;
      const newSpecs = productData.specifications;
      const allKeys = new Set([...Object.keys(existingSpecs), ...Object.keys(newSpecs)]);
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
      const newStock = existingProduct.inventory.currentStock + productData.inventory.currentStock;
      await updateProductInventory(existingProduct._id, {
        currentStock: newStock,
        purchasePrice: productData.pricing.purchasePrice,
        sellingPrice: productData.pricing.sellingPrice,
      });
      return { 
        success: true, 
        data: { ...existingProduct, inventory: { ...existingProduct.inventory, currentStock: newStock } }, 
        isUpdate: true 
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
          notes: `Initial stock for ${newProduct.name}`,
        });
        return { success: true, data: newProduct, isUpdate: false };
      } else {
        set({ error: response.error || "Failed to create product" });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  handleRealtimeProductUpdate: (product) => {
    set((state) => ({ 
      products: state.products.map((p) => (p._id === product._id ? { ...p, ...product } : p))
    }));
    get().fetchInventorySummary();
  },

  handleRealtimeStockTransaction: (transaction) => {
    set((state) => ({ stockTransactions: [transaction, ...state.stockTransactions] }));
    const { products } = get();
    const productIndex = products.findIndex((p) => p._id === transaction.product._id);
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
        inventory: { ...productToUpdate.inventory, currentStock: newStock }
      };
      set({ products: updatedProducts });
    }
  },

  getProductsByCategory: (categoryName) => get().products.filter((p) => p.category.name.toLowerCase() === categoryName.toLowerCase()),
  getProductsByBrand: (brandName) => get().products.filter((p) => p.brand.name.toLowerCase() === brandName.toLowerCase()),
  getLowStockProducts: () => get().products.filter((p) => p.isActive && !p.deleted && p.inventory.currentStock <= p.inventory.minimumStock),
  getOutOfStockProducts: () => get().products.filter((p) => p.isActive && !p.deleted && p.inventory.currentStock <= 0),
  getFeaturedProducts: () => get().products.filter((p) => p.isActive && !p.deleted && p.isFeatured),
  getProductById: (productId) => get().products.find((p) => p._id === productId),

  getConsolidatedProducts: () => {
    const { products } = get();
    const activeProducts = products.filter((p) => !p.deleted);
    const groupedProducts = new Map<string, Product[]>();

    activeProducts.forEach((product) => {
      const key = `${product.name.toLowerCase()}-${product.brand.name.toLowerCase()}-${JSON.stringify(product.specifications)}`;
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
        const latest = group.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        const totalStock = group.reduce((sum, p) => sum + p.inventory.currentStock, 0);
        const consolidated: Product = {
          ...latest,
          inventory: { ...latest.inventory, currentStock: totalStock },
          _consolidated: { totalEntries: group.length, originalIds: group.map((p) => p._id), latestPriceUpdate: latest.updatedAt },
        };
        consolidatedProducts.push(consolidated);
      }
    });
    return consolidatedProducts;
  },

  softDeleteProduct: async (productId) => {
    try {
      const response = await inventoryApi.updateProduct(productId, { deleted: true });
      if (response.success) {
        set((state) => ({ 
          products: state.products.map((p) => p._id === productId ? { ...p, deleted: true, deletedAt: new Date().toISOString() } : p)
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to soft delete product" });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "An unknown error occurred" });
      return false;
    }
  },

  restoreProduct: async (productId) => {
    try {
      const response = await inventoryApi.updateProduct(productId, { deleted: false });
      if (response.success) {
        set((state) => ({ 
          products: state.products.map((p) => p._id === productId ? { ...p, deleted: false, deletedAt: undefined } : p)
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to restore product" });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "An unknown error occurred" });
      return false;
    }
  },

  deleteProduct: async (productId) => {
    try {
      const response = await inventoryApi.deleteProduct(productId);
      if (response.success) {
        set((state) => ({ products: state.products.filter((p) => p._id !== productId) }));
        return true;
      } else {
        set({ error: response.error || "Failed to permanently delete product" });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "An unknown error occurred" });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  refreshData: async () => {
    await get().fetchProducts();
    await get().fetchInventorySummary();
  },

  initializeRealtime: () => {
    const { on } = useSanityRealtimeStore.getState();
    on("bill:created", (bill) => get().handleBillCreated(bill));
    on("inventory:updated", ({ productId, updates }) => get().handleRealtimeProductUpdate({ _id: productId, ...updates } as Product));
    on("inventory:low_stock", (data) => console.log(`Low stock alert: ${data.productName}`));
  },

  cleanupRealtime: () => {
    const { off } = useSanityRealtimeStore.getState();
    off("bill:created");
    off("inventory:updated");
    off("inventory:low_stock");
  },

  handleBillCreated: (bill) => {
    bill.items?.forEach(async (item: any) => {
      const { products, createStockTransaction } = get();
      const product = products.find((p) => p._id === item.product);
      if (product) {
        const newStock = product.inventory.currentStock - item.quantity;
        set((state) => ({ 
          products: state.products.map((p) =>
            p._id === item.product ? { ...p, inventory: { ...p.inventory, currentStock: newStock } } : p
          )
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
}));  

  refreshData: async () => {
    const { fetchProducts, fetchInventorySummary } = get();
    await Promise.all([fetchProducts(), fetchInventorySummary()]);
  },
}));
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
  createStockTransaction: async (transactionData: {
    productId: string;
    type: "purchase" | "sale" | "adjustment" | "return" | "damage";
    quantity: number;
    unitPrice: number;
    supplierId?: string;
    billId?: string;
    notes?: string;
    updateInventory?: boolean;
  }) => {
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
    specifications: Specification;
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

      // Comprehensive validation of required fields
      const missingFields = [];
      if (!productData.name?.trim()) missingFields.push("name");
      if (!productData.brandId) missingFields.push("brandId");
      if (!productData.categoryId) missingFields.push("categoryId");
      if (!productData.pricing?.purchasePrice)
        missingFields.push("pricing.purchasePrice");
      if (!productData.pricing?.sellingPrice)
        missingFields.push("pricing.sellingPrice");
      if (
        productData.inventory?.currentStock === undefined ||
        productData.inventory?.currentStock === null
      )
        missingFields.push("inventory.currentStock");

      if (missingFields.length > 0) {
        console.error("❌ Missing required fields:", missingFields);
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
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

          // Create stock transaction for the addition (without updating inventory since we already did that)
          await get().createStockTransaction({
            productId: existingProduct._id,
            type: "purchase",
            quantity: productData.inventory.currentStock,
            unitPrice: productData.pricing.purchasePrice,
            notes: `Stock updated with latest price. New total: ${newTotalStock} ${productData.pricing.unit}`,
            updateInventory: false, // Don't update inventory since we already set it above
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
          const newProduct = response.data as Product;
          set((state) => ({ products: [...state.products, newProduct] }));

          // Refresh inventory summary
          await get().fetchInventorySummary();

          // Create stock transaction for the new product purchase (without updating inventory since we already set it)
          await get().createStockTransaction({
            productId: newProduct._id,
            type: "purchase",
            quantity: productData.inventory.currentStock,
            unitPrice: productData.pricing.purchasePrice,
            notes: `Initial stock for ${newProduct.name}`,
            updateInventory: false, // Already set
          });

          return { success: true, data: newProduct, isUpdate: false };
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

  // Handle realtime product updates (different from form-based addOrUpdateProduct)
  handleRealtimeProductUpdate: (product) => {
    const { products } = get();

    if (!product || !product._id) {
      console.warn("⚠️ Invalid product data for realtime update");
      return;
    }

    // Check if product already exists
    const existingIndex = products.findIndex((p) => p._id === product._id);

    if (existingIndex >= 0) {
      // Update existing product
      const updatedProducts = [...products];
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        ...product,
      };
      set({ products: updatedProducts });
      console.log(`🔄 Product updated via realtime: ${product.name}`);
    } else {
      // Add new product
      set({ products: [...products, product] });
      console.log(`✅ Product added via realtime: ${product.name}`);
    }
  },

  // Handle realtime stock transaction updates
  handleRealtimeStockTransaction: (transaction) => {
    const { stockTransactions } = get();

    if (!transaction || !transaction._id) {
      console.warn("⚠️ Invalid stock transaction data for realtime update");
      return;
    }

    // Check if transaction already exists
    const existingIndex = stockTransactions.findIndex(
      (t) => t._id === transaction._id
    );

    if (existingIndex >= 0) {
      // Update existing transaction
      const updatedTransactions = [...stockTransactions];
      updatedTransactions[existingIndex] = {
        ...updatedTransactions[existingIndex],
        ...transaction,
      };
      set({ stockTransactions: updatedTransactions });
      console.log(
        `🔄 Stock transaction updated via realtime: ${transaction._id}`
      );
    } else {
      // Add new transaction
      set({ stockTransactions: [transaction, ...stockTransactions] });
      console.log(
        `✅ Stock transaction added via realtime: ${transaction._id}`
      );
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

    // Filter out soft deleted products
    const activeProducts = products.filter((product) => !product.deleted);
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

  // Delete product
  deleteProduct: async (productId) => {
    try {
      // Remove from local state immediately for optimistic update
      const { products } = get();
      const updatedProducts = products.filter(
        (product) => product._id !== productId
      );
      set({ products: updatedProducts });

      // Note: Actual deletion is handled by the enhanced inventory API
      // This just updates the local state
      return true;
    } catch (error) {
      console.error("Error in deleteProduct:", error);
      // Refresh data to restore state if needed
      await get().fetchProducts();
      return false;
    }
  },

  // Real-time methods
  initializeRealtime: () => {
    const { on } = useSanityRealtimeStore.getState();

    // Listen for bill creation to update inventory
    on("bill:created", (bill: any) => {
      get().handleBillCreated(bill);
    });

    // Listen for direct inventory updates
    on(
      "inventory:updated",
      ({ productId, updates }: { productId: string; updates: any }) => {
        console.log("🔔 Real-time: Inventory updated", productId);
        const { products } = get();
        const updatedProducts = products.map((product) =>
          product._id === productId ? { ...product, ...updates } : product
        );
        set({ products: updatedProducts });
      }
    );

    on("inventory:low_stock", (data: any) => {
      console.log("🔔 Real-time: Low stock alert", data.productName);
      // You could trigger notifications here
    });
  },

  cleanupRealtime: () => {
    const { off } = useSanityRealtimeStore.getState();
    off("bill:created");
    off("inventory:updated");
    off("inventory:low_stock");
  },

  handleBillCreated: (bill: any) => {
    const { products, updateProductInventory, createStockTransaction } = get();

    // Update inventory for each item in the bill
    bill.items?.forEach(async (item: any) => {
      const product = products.find((p) => p._id === item.product);
      if (product) {
        const newStock = Math.max(
          0,
          product.inventory.currentStock - item.quantity
        );

        // Update local state immediately
        const updatedProducts = products.map((p) =>
          p._id === item.product
            ? { ...p, inventory: { ...p.inventory, currentStock: newStock } }
            : p
        );
        set({ products: updatedProducts });

        // Create stock transaction
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

    // Refresh inventory summary
    get().fetchInventorySummary();
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
