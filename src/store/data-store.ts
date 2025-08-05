import { create } from "zustand";
import { sanityClient, queries, setupRealtimeListeners } from "@/lib/sanity";
import { fallbackData } from "./fallback-data";

// Types for our data entities
interface Brand {
  _id: string;
  name: string;
  slug: { current: string };
  logo?: any;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  icon?: string;
  parentCategory?: any;
  isActive: boolean;
  sortOrder: number;
}

interface Product {
  _id: string;
  productId: string;
  name: string;
  slug: { current: string };
  description?: string;
  brand: Brand;
  category: Category;
  specifications: any;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
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
  };
  images: any[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
}

interface User {
  _id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: string;
}

interface Bill {
  _id: string;
  billId: string;
  billNumber: string;
  customer: User;
  items: Array<{
    product: {
      _type: "reference";
      _ref: string;
    };
    productName: string;
    category?: string;
    brand?: string;
    specifications?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unit?: string;
  }>;
  serviceType: "repair" | "sale" | "installation" | "maintenance" | "custom";
  locationType: "shop" | "home" | "office";
  serviceDate: string;
  homeVisitFee: number;
  transportationFee?: number;
  laborCharges?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
  paymentMethod?: string;
  paidAmount: number;
  balanceAmount: number;
  status: "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DataStore {
  // Loading states
  isLoading: boolean;
  loadingProgress: number;
  lastSyncTime: Date | null;
  error: string | null;

  // Data maps for fast lookups
  brands: Map<string, Brand>;
  categories: Map<string, Category>;
  products: Map<string, Product>;
  users: Map<string, User>;
  bills: Map<string, Bill>;

  // Lookup maps for performance
  usersByClerkId: Map<string, string>;
  productsByCategory: Map<string, string[]>;
  billsByCustomer: Map<string, string[]>;
  productsByBrand: Map<string, string[]>;

  // Actions
  loadInitialData: () => Promise<void>;
  syncWithSanity: () => Promise<void>;
  handleRealtimeUpdate: (update: any) => void;

  // Getters
  getProductsByCategory: (categoryId: string) => Product[];
  getBillsByCustomer: (customerId: string) => Bill[];
  getActiveProducts: () => Product[];
  getBrandById: (brandId: string) => Brand | undefined;
  getCategoryById: (categoryId: string) => Category | undefined;
  getProductById: (productId: string) => Product | undefined;
  getUserById: (userId: string) => User | undefined;
  getBillById: (billId: string) => Bill | undefined;

  // CRUD operations
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (
    productId: string,
    updates: Partial<Product>
  ) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  createBill: (bill: Partial<Bill>) => Promise<Bill>;
  updateBill: (billId: string, updates: Partial<Bill>) => Promise<Bill>;
  createUser: (user: Partial<User>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User>;
}

export const useDataStore = create<DataStore>((set, get) => ({
  // Initial state
  isLoading: false,
  loadingProgress: 0,
  lastSyncTime: null,
  error: null,

  brands: new Map(),
  categories: new Map(),
  products: new Map(),
  users: new Map(),
  bills: new Map(),

  usersByClerkId: new Map(),
  productsByCategory: new Map(),
  billsByCustomer: new Map(),
  productsByBrand: new Map(),

  // Load initial data from Sanity
  loadInitialData: async () => {
    set({ isLoading: true, loadingProgress: 0, error: null });

    try {
      // Load data in sequence for better UX
      const loadingSteps = [
        { name: "brands", query: queries.brands, progress: 20 },
        { name: "categories", query: queries.categories, progress: 40 },
        { name: "products", query: queries.activeProducts, progress: 60 },
        { name: "users", query: queries.customers, progress: 80 },
        { name: "bills", query: queries.bills, progress: 100 },
      ];

      for (const step of loadingSteps) {
        const data = await sanityClient.fetch(step.query);

        // Update the appropriate map
        const currentState = get();
        const newMap = new Map(
          currentState[step.name as keyof DataStore] as Map<string, any>
        );

        // Filter out null/undefined items and items without _id
        let validData = Array.isArray(data)
          ? data.filter((item) => item && item._id)
          : [];

        // Additional filtering for products to ensure they have valid references
        if (step.name === "products") {
          validData = validData.filter((product) => {
            // Ensure product has basic required fields
            return (
              product.name &&
              product.pricing &&
              product.inventory &&
              // Brand and category can be null, we'll handle that in the UI
              true
            );
          });
        }

        validData.forEach((item: any) => {
          newMap.set(item._id, item);
        });

        set({
          [step.name]: newMap,
          loadingProgress: step.progress,
        });

        // Build lookup maps
        if (step.name === "products") {
          const productsByCategory = new Map<string, string[]>();
          const productsByBrand = new Map<string, string[]>();

          validData.forEach((product: Product) => {
            // Group by category (with null checks)
            if (product.category && product.category._id) {
              const categoryId = product.category._id;
              if (!productsByCategory.has(categoryId)) {
                productsByCategory.set(categoryId, []);
              }
              productsByCategory.get(categoryId)!.push(product._id);
            }

            // Group by brand (with null checks)
            if (product.brand && product.brand._id) {
              const brandId = product.brand._id;
              if (!productsByBrand.has(brandId)) {
                productsByBrand.set(brandId, []);
              }
              productsByBrand.get(brandId)!.push(product._id);
            }
          });

          set({ productsByCategory, productsByBrand });
        }

        if (step.name === "users") {
          const usersByClerkId = new Map<string, string>();
          validData.forEach((user: User) => {
            if (user.clerkId && user._id) {
              usersByClerkId.set(user.clerkId, user._id);
            }
          });
          set({ usersByClerkId });
        }

        if (step.name === "bills") {
          const billsByCustomer = new Map<string, string[]>();
          validData.forEach((bill: Bill) => {
            if (bill.customer && bill.customer._id && bill._id) {
              const customerId = bill.customer._id;
              if (!billsByCustomer.has(customerId)) {
                billsByCustomer.set(customerId, []);
              }
              billsByCustomer.get(customerId)!.push(bill._id);
            }
          });
          set({ billsByCustomer });
        }
      }

      set({
        isLoading: false,
        lastSyncTime: new Date(),
        error: null,
      });

      // Setup real-time listeners
      setupRealtimeListeners(get().handleRealtimeUpdate);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      console.log("Loading fallback data...");

      // Load fallback data instead of failing completely
      try {
        const brands = new Map();
        const categories = new Map();
        const products = new Map();
        const users = new Map();
        const bills = new Map();

        // Load fallback data
        fallbackData.brands.forEach((item) => brands.set(item._id, item));
        fallbackData.categories.forEach((item) =>
          categories.set(item._id, item)
        );
        fallbackData.products.forEach((item) => products.set(item._id, item));
        fallbackData.users.forEach((item) => users.set(item._id, item));
        fallbackData.bills.forEach((item) => bills.set(item._id, item));

        // Build lookup maps
        const productsByCategory = new Map<string, string[]>();
        const productsByBrand = new Map<string, string[]>();
        const usersByClerkId = new Map<string, string>();
        const billsByCustomer = new Map<string, string[]>();

        fallbackData.products.forEach((product) => {
          // Group by category
          const categoryId = product.category._id;
          if (!productsByCategory.has(categoryId)) {
            productsByCategory.set(categoryId, []);
          }
          productsByCategory.get(categoryId)!.push(product._id);

          // Group by brand
          const brandId = product.brand._id;
          if (!productsByBrand.has(brandId)) {
            productsByBrand.set(brandId, []);
          }
          productsByBrand.get(brandId)!.push(product._id);
        });

        fallbackData.users.forEach((user) => {
          usersByClerkId.set(user.clerkId, user._id);
        });

        fallbackData.bills.forEach((bill) => {
          const customerId = bill.customer._id;
          if (!billsByCustomer.has(customerId)) {
            billsByCustomer.set(customerId, []);
          }
          billsByCustomer.get(customerId)!.push(bill._id);
        });

        set({
          brands,
          categories,
          products,
          users,
          bills,
          productsByCategory,
          productsByBrand,
          usersByClerkId,
          billsByCustomer,
          isLoading: false,
          lastSyncTime: new Date(),
          error: `Sanity connection failed. Using demo data. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });

        console.log("✅ Fallback data loaded successfully");
      } catch (fallbackError) {
        console.error("Failed to load fallback data:", fallbackError);
        set({
          isLoading: false,
          error: `Both Sanity and fallback data failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }
  },

  // Sync with Sanity (refresh data)
  syncWithSanity: async () => {
    await get().loadInitialData();
  },

  // Handle real-time updates from Sanity
  handleRealtimeUpdate: (update) => {
    const { mutation, document } = update;

    if (!document) return;

    const currentState = get();

    switch (document._type) {
      case "product":
        const products = new Map(currentState.products);
        if (mutation === "delete") {
          products.delete(document._id);
        } else {
          products.set(document._id, document);
        }
        set({ products });
        break;

      case "user":
        const users = new Map(currentState.users);
        if (mutation === "delete") {
          users.delete(document._id);
        } else {
          users.set(document._id, document);
        }
        set({ users });
        break;

      case "bill":
        const bills = new Map(currentState.bills);
        if (mutation === "delete") {
          bills.delete(document._id);
        } else {
          bills.set(document._id, document);
        }
        set({ bills });
        break;

      case "brand":
        const brands = new Map(currentState.brands);
        if (mutation === "delete") {
          brands.delete(document._id);
        } else {
          brands.set(document._id, document);
        }
        set({ brands });
        break;

      case "category":
        const categories = new Map(currentState.categories);
        if (mutation === "delete") {
          categories.delete(document._id);
        } else {
          categories.set(document._id, document);
        }
        set({ categories });
        break;
    }
  },

  // Getters
  getProductsByCategory: (categoryId: string) => {
    const { products, productsByCategory } = get();
    const productIds = productsByCategory.get(categoryId) || [];
    return productIds
      .map((id) => products.get(id))
      .filter(Boolean) as Product[];
  },

  getBillsByCustomer: (customerId: string) => {
    const { bills, billsByCustomer } = get();
    const billIds = billsByCustomer.get(customerId) || [];
    return billIds.map((id) => bills.get(id)).filter(Boolean) as Bill[];
  },

  getActiveProducts: () => {
    const { products } = get();
    return Array.from(products.values()).filter((product) => product.isActive);
  },

  getBrandById: (brandId: string) => {
    return get().brands.get(brandId);
  },

  getCategoryById: (categoryId: string) => {
    return get().categories.get(categoryId);
  },

  getProductById: (productId: string) => {
    return get().products.get(productId);
  },

  getUserById: (userId: string) => {
    return get().users.get(userId);
  },

  getBillById: (billId: string) => {
    return get().bills.get(billId);
  },

  // CRUD operations
  createProduct: async (productData) => {
    try {
      const product = await sanityClient.create({
        _type: "product",
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      const products = new Map(get().products);
      products.set(product._id, product as Product);
      set({ products });

      return product as Product;
    } catch (error) {
      console.error("Failed to create product:", error);
      throw error;
    }
  },

  updateProduct: async (productId, updates) => {
    try {
      const product = await sanityClient
        .patch(productId)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .commit();

      // Update local store
      const products = new Map(get().products);
      products.set(productId, product as Product);
      set({ products });

      return product as Product;
    } catch (error) {
      console.error("Failed to update product:", error);
      throw error;
    }
  },

  deleteProduct: async (productId) => {
    try {
      await sanityClient.delete(productId);

      // Update local store
      const products = new Map(get().products);
      products.delete(productId);
      set({ products });
    } catch (error) {
      console.error("Failed to delete product:", error);
      throw error;
    }
  },

  createBill: async (billData) => {
    try {
      const bill = await sanityClient.create({
        _type: "bill",
        ...billData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      const bills = new Map(get().bills);
      bills.set(bill._id, bill as Bill);
      set({ bills });

      return bill as Bill;
    } catch (error) {
      console.error("Failed to create bill:", error);
      throw error;
    }
  },

  updateBill: async (billId, updates) => {
    try {
      const bill = await sanityClient
        .patch(billId)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .commit();

      // Update local store
      const bills = new Map(get().bills);
      bills.set(billId, bill as Bill);
      set({ bills });

      return bill as Bill;
    } catch (error) {
      console.error("Failed to update bill:", error);
      throw error;
    }
  },

  createUser: async (userData) => {
    try {
      const user = await sanityClient.create({
        _type: "user",
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      const users = new Map(get().users);
      users.set(user._id, user as User);
      set({ users });

      return user as User;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const user = await sanityClient
        .patch(userId)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .commit();

      // Update local store
      const users = new Map(get().users);
      users.set(userId, user as User);
      set({ users });

      return user as User;
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  },
}));
