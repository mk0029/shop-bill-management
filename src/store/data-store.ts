import { create } from "zustand";
import { sanityClient, queries } from "@/lib/sanity";
import { useAuthStore } from "@/store/auth-store";
import { fallbackData } from "./fallback-data";
import { type SanityClient } from "@sanity/client";
import type { Subscription } from "rxjs";

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
  repairFee?: number;
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
  // Non-blocking refresh state (used for lightweight refreshes)
  isRefreshing: boolean;

  // Real-time connection
  realtimeSubscription: Subscription | null;
  isRealtimeConnected: boolean;

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
  loadInitialData: (opts?: {
    role?: "admin" | "customer";
    userId?: string;
    customerId?: string;
  }) => Promise<void>;
  // Convenience wrappers
  loadAdminData: (opts?: { userId?: string; customerId?: string }) => Promise<void>;
  loadCustomerData: (opts: { userId?: string; customerId?: string }) => Promise<void>;
  syncWithSanity: () => Promise<void>;
  // Lightweight, role-aware refresh that only updates bills (and indexes)
  refreshBillsOnly: (opts?: { role?: "admin" | "customer"; customerId?: string }) => Promise<void>;
  // Lighter refreshes to avoid full-page like resets
  refreshActiveProducts: () => Promise<void>;
  refreshProductsByIds: (ids: string[]) => Promise<void>;
  applyInventoryDelta: (
    deltas: Array<{ productId: string; quantity: number; action: "reduce" | "increase" }>
  ) => void;
  setupRealtimeListeners: () => void;
  cleanupRealtimeListeners: () => void;
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
  deleteBrand: (brandId: string) => Promise<void>;
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
  isRefreshing: false,

  // Real-time state
  realtimeSubscription: null,
  isRealtimeConnected: false,

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
  loadInitialData: async (opts) => {
    set({ isLoading: true, loadingProgress: 0, error: null });

    try {
      // Determine scope based on role
      const role = opts?.role;
      const isCustomer = role === "customer";

      // Build loading steps conditionally
      const loadingSteps: Array<{ name: string; query: string; progress: number; params?: Record<string, any> }> = [];

      if (isCustomer) {
        // For customers, do NOT fetch brands/categories/products to minimize payload
        // Fetch only the logged-in user's doc
        const singleUserQuery = `*[_type == "user" && (_id == $userId || customerId == $customerId)][0]`;
        const userParams = {
          userId: opts?.userId || "",
          customerId: opts?.customerId || "",
        };
        loadingSteps.push({ name: "users", query: singleUserQuery, progress: 80, params: userParams });

        // Fetch only this customer's bills; requires a customerId
        const cid = opts?.customerId || opts?.userId || "";
        loadingSteps.push({ name: "bills", query: queries.customerBills(String(cid)), progress: 100 });
      } else {
        // Admin or unspecified role: full datasets
        loadingSteps.push({ name: "brands", query: queries.brands, progress: 20 });
        loadingSteps.push({ name: "categories", query: queries.categories, progress: 40 });
        loadingSteps.push({ name: "products", query: queries.activeProducts, progress: 60 });
        loadingSteps.push({ name: "users", query: queries.users, progress: 80 });
        loadingSteps.push({ name: "bills", query: queries.bills, progress: 100 });
      }

      for (const step of loadingSteps) {
        const data = await sanityClient.fetch(step.query, step.params ?? {});

        // Update the appropriate map
        const currentState = get();
        const newMap = new Map(
          currentState[step.name as keyof DataStore] as Map<string, any>
        );

        // Normalize data to array; filter out invalid items
        let validData = Array.isArray(data)
          ? data.filter((item) => item && item._id)
          : data
          ? [(data as any)].filter((item) => item && item._id)
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
      get().setupRealtimeListeners();
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
          error: `Sanity connection failed. Using fallback data. Error: ${
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

  // Convenience: explicit admin bootstrap
  loadAdminData: async (opts) => {
    await get().loadInitialData({ role: "admin", userId: opts?.userId, customerId: opts?.customerId });
  },

  // Convenience: explicit customer bootstrap
  loadCustomerData: async (opts) => {
    await get().loadInitialData({ role: "customer", userId: opts.userId, customerId: opts.customerId });
  },

  // Sync with Sanity (refresh data)
  syncWithSanity: async () => {
    // Lightweight, non-blocking refresh. Avoid full reload and listener reset.
    try {
      const { user, role } = useAuthStore.getState();
      const customerId = (user as any)?.customerId as string | undefined;

      // Refresh bills in a role-aware way; avoid toggling isLoading
      await get().refreshBillsOnly({
        role: (role as any) || undefined,
        customerId,
      });

      // Optionally keep products fresh for admin without heavy reload
      if (!role || role === "admin") {
        // Fire-and-forget; don't block the bills path
        get().refreshActiveProducts().catch(() => {});
      }
    } catch (e) {
      // Silent: this is a background refresh path
      console.warn("syncWithSanity (light) failed", e);
    }
  },

  // Lightweight refresh: only bills, non-blocking
  refreshBillsOnly: async (opts) => {
    try {
      set({ isRefreshing: true });
      const role = opts?.role;
      const customerId = opts?.customerId;

      let query: string;
      let params: Record<string, any> | undefined = undefined;

      if (role === "customer") {
        const cid = String(customerId || "");
        query = queries.customerBills(cid);
      } else {
        // Default/admin path
        query = queries.bills;
      }

      const data = await sanityClient.fetch(query, params ?? {});

      const bills = new Map(get().bills);
      const billsByCustomer = new Map<string, string[]>();
      const list = Array.isArray(data) ? data : [];

      for (const bill of list) {
        if (!bill?._id) continue;
        bills.set(bill._id, bill);
        const custId = bill?.customer?._id || bill?.customer?._ref;
        if (custId) {
          const arr = billsByCustomer.get(custId) || [];
          if (!arr.includes(bill._id)) arr.push(bill._id);
          billsByCustomer.set(custId, arr);
        }
      }

      set({ bills, billsByCustomer, lastSyncTime: new Date() });
    } catch (e) {
      console.warn("refreshBillsOnly failed", e);
    } finally {
      set({ isRefreshing: false });
    }
  },

  // Refresh only active products list (keeps other maps intact)
  refreshActiveProducts: async () => {
    try {
      const data = await sanityClient.fetch(queries.activeProducts);
      const products = new Map(get().products);
      const productsByCategory = new Map<string, string[]>();
      const productsByBrand = new Map<string, string[]>();

      (Array.isArray(data) ? data : []).forEach((p: any) => {
        if (!p?._id) return;
        products.set(p._id, p);
        if (p.category?._id) {
          const arr = productsByCategory.get(p.category._id) || [];
          arr.push(p._id);
          productsByCategory.set(p.category._id, arr);
        }
        if (p.brand?._id) {
          const arr = productsByBrand.get(p.brand._id) || [];
          arr.push(p._id);
          productsByBrand.set(p.brand._id, arr);
        }
      });

      set({ products, productsByCategory, productsByBrand, lastSyncTime: new Date() });
    } catch (e) {
      console.warn("refreshActiveProducts failed", e);
    }
  },

  // Targeted: fetch and update only specific products
  refreshProductsByIds: async (ids: string[]) => {
    try {
      const uniq = Array.from(new Set(ids.filter(Boolean)));
      if (uniq.length === 0) return;

      const query = `*[_type == "product" && _id in $ids] {
        ...,
        brand->{
          _id,
          _type,
          "name": select(
            defined(name) => name,
            defined(title) => title,
            "Unnamed Brand"
          ),
          slug,
          logo,
          description,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        },
        category->{
          _id,
          _type,
          name,
          slug,
          description,
          icon,
          parentCategory->{ _id, name },
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        }
      }`;

      const updated = await (sanityClient as unknown as SanityClient).fetch(query, { ids: uniq });

      const products = new Map(get().products);
      const productsByCategory = new Map(get().productsByCategory);
      const productsByBrand = new Map(get().productsByBrand);

      (Array.isArray(updated) ? updated : []).forEach((p: any) => {
        if (!p?._id) return;
        products.set(p._id, p);
        if (p.category?._id) {
          const arr = productsByCategory.get(p.category._id) || [];
          if (!arr.includes(p._id)) arr.push(p._id);
          productsByCategory.set(p.category._id, arr);
        }
        if (p.brand?._id) {
          const arr = productsByBrand.get(p.brand._id) || [];
          if (!arr.includes(p._id)) arr.push(p._id);
          productsByBrand.set(p.brand._id, arr);
        }
      });

      set({ products, productsByCategory, productsByBrand });
    } catch (e) {
      console.warn("refreshProductsByIds failed", e);
    }
  },

  // Optimistically apply inventory change locally
  applyInventoryDelta: (deltas) => {
    const products = new Map(get().products);
    let changed = false;
    for (const d of deltas) {
      const p = products.get(d.productId);
      if (!p || !p.inventory) continue;
      const curr = Number(p.inventory.currentStock || 0);
      const diff = d.action === "reduce" ? -Math.abs(d.quantity) : Math.abs(d.quantity);
      const next = Math.max(0, curr + diff);
      if (next !== curr) {
        products.set(d.productId, {
          ...p,
          inventory: { ...p.inventory, currentStock: next },
        } as any);
        changed = true;
      }
    }
    if (changed) set({ products });
  },

  // Setup Sanity real-time listeners
  setupRealtimeListeners: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) return; // Already connected

    console.log("🔌 Setting up Sanity real-time listeners...");

    const subscription = sanityClient
      .listen(
        '*[_type in ["bill", "product", "user", "brand", "category", "stockTransaction"]]'
      )
      .subscribe({
        next: (update) => {
          console.log("📡 Sanity real-time update:", update);
          set({ isRealtimeConnected: true });
          get().handleRealtimeUpdate(update);
        },
        error: (error) => {
          console.error("❌ Sanity real-time error:", error);
          set({ isRealtimeConnected: false });
        },
      });

    set({
      realtimeSubscription: subscription,
      isRealtimeConnected: true,
    });

    console.log("✅ Sanity real-time listeners connected");
  },

  // Cleanup real-time listeners
  cleanupRealtimeListeners: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      set({
        realtimeSubscription: null,
        isRealtimeConnected: false,
      });
      console.log("❌ Sanity real-time listeners disconnected");
    }
  },

  // Handle real-time updates from Sanity
  handleRealtimeUpdate: (update) => {
    const documentType =
      update.result?._type || update.documentId?.split(".")[0];
    const document = update.result;
    const documentId = update.documentId;

    if (!documentType) return;

    const currentState = get();
    console.log(
      `🔔 Real-time ${update.transition}: ${documentType} - ${documentId}`
    );

    switch (documentType) {
      case "product":
        const products = new Map(currentState.products);
        if (update.transition === "disappear") {
          products.delete(documentId);
          console.log(`🗑️ Product deleted: ${documentId}`);
        } else if (document) {
          products.set(documentId, document);
          console.log(`📦 Product ${update.transition}: ${document.name}`);

          // Update lookup maps for products
          if (update.transition === "appear") {
            const { productsByCategory, productsByBrand } = currentState;

            if (document.category?._id) {
              const categoryProducts =
                productsByCategory.get(document.category._id) || [];
              if (!categoryProducts.includes(documentId)) {
                categoryProducts.push(documentId);
                productsByCategory.set(document.category._id, categoryProducts);
              }
            }

            if (document.brand?._id) {
              const brandProducts =
                productsByBrand.get(document.brand._id) || [];
              if (!brandProducts.includes(documentId)) {
                brandProducts.push(documentId);
                productsByBrand.set(document.brand._id, brandProducts);
              }
            }

            set({ productsByCategory, productsByBrand });
          }
        }
        set({ products });
        break;

      case "user":
        const users = new Map(currentState.users);
        if (update.transition === "disappear") {
          users.delete(documentId);
          // Also remove from clerkId lookup
          const usersByClerkId = new Map(currentState.usersByClerkId);
          for (const [clerkId, userId] of usersByClerkId.entries()) {
            if (userId === documentId) {
              usersByClerkId.delete(clerkId);
              break;
            }
          }
          set({ usersByClerkId });
          console.log(`🗑️ User deleted: ${documentId}`);
        } else if (document) {
          users.set(documentId, document);
          // Update clerkId lookup
          if (document.clerkId) {
            const usersByClerkId = new Map(currentState.usersByClerkId);
            usersByClerkId.set(document.clerkId, documentId);
            set({ usersByClerkId });
          }
          console.log(`👤 User ${update.transition}: ${document.name}`);
        }
        set({ users });
        break;

      case "bill":
        const bills = new Map(currentState.bills);
        if (update.transition === "disappear") {
          bills.delete(documentId);
          console.log(`🗑️ Bill deleted: ${documentId}`);
        } else if (document) {
          // 1) Create a normalized copy so UI gets customer fields immediately
          const normalizedBill: any = { ...document };

          // Resolve customer details if only a reference came through the realtime payload
          const cust = document.customer;
          const customerId =
            (typeof cust === "string" && cust) ||
            cust?._id ||
            cust?._ref ||
            undefined;
          const customerHasName = Boolean(cust && (cust as any).name);

          if (customerId && !customerHasName) {
            const knownUser = currentState.users.get(customerId as string);
            if (knownUser) {
              normalizedBill.customer = {
                _id: knownUser._id,
                name: knownUser.name,
                phone: knownUser.phone,
                email: knownUser.email,
                location: knownUser.location,
                role: knownUser.role,
              };
            }
          }

          bills.set(documentId, normalizedBill);

          // 2) Update customer -> bills index
          const effectiveCustomerId =
            normalizedBill.customer?._id || customerId;
          if (effectiveCustomerId && update.transition === "appear") {
            const billsByCustomer = new Map(currentState.billsByCustomer);
            const customerBills = billsByCustomer.get(effectiveCustomerId) || [];
            if (!customerBills.includes(documentId)) {
              customerBills.push(documentId);
              billsByCustomer.set(effectiveCustomerId, customerBills);
              set({ billsByCustomer });
            }
          }

          console.log(`📄 Bill ${update.transition}: ${document.billNumber}`);
        }
        set({ bills });
        break;

      case "brand":
        const brands = new Map(currentState.brands);
        if (update.transition === "disappear") {
          brands.delete(documentId);
          console.log(`🗑️ Brand deleted: ${documentId}`);
        } else if (document) {
          brands.set(documentId, document);
          console.log(`🏷️ Brand ${update.transition}: ${document.name}`);
        }
        set({ brands });
        break;

      case "category":
        const categories = new Map(currentState.categories);
        if (update.transition === "disappear") {
          categories.delete(documentId);
          console.log(`🗑️ Category deleted: ${documentId}`);
        } else if (document) {
          categories.set(documentId, document);
          console.log(`📂 Category ${update.transition}: ${document.name}`);
        }
        set({ categories });
        break;

      case "stockTransaction":
        // When a stock transaction appears, ensure the related product is refreshed ASAP
        if (document && update.transition === "appear") {
          console.log(
            `📊 Stock transaction created: ${document.type} - ${document.quantity} units`
          );
          const prodRef = document.product?._ref || document.product || document.productId;
          if (prodRef) {
            // Fire-and-forget targeted refresh
            get().refreshProductsByIds([String(prodRef)]).catch(() => {});
          }
        }
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
      products.set(productId, product as unknown as Product);
      set({ products });

      return product as unknown as Product;
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

  deleteBrand: async (brandId) => {
    try {
      await sanityClient.delete(brandId);

      // Update local store
      const brands = new Map(get().brands);
      brands.delete(brandId);
      set({ brands });
    } catch (error) {
      console.error("Failed to delete brand:", error);
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

      // Don't add to local state here - let the realtime listener handle it
      // This prevents duplicates when the realtime "appear" event fires
      console.log("✅ Bill created in Sanity, waiting for realtime sync...");

      return bill as unknown as Bill;
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
      bills.set(billId, bill as unknown as Bill);
      set({ bills });

      return bill as unknown as Bill;
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

      // Don't add to local state here - let the realtime listener handle it
      // This prevents duplicates when the realtime "appear" event fires
      console.log("✅ User created in Sanity, waiting for realtime sync...");

      return user as unknown as User;
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
      users.set(userId, user as unknown as User);
      set({ users });

      return user as unknown as User;
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  },
}));
