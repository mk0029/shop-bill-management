import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";
import type { Subscription } from "@sanity/client";

export interface Category {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  icon?: string;
  parentCategory?: Category;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryStore {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Real-time connection
  realtimeSubscription: Subscription | null;
  isRealtimeConnected: boolean;

  // Actions
  fetchCategories: () => Promise<void>;
  getActiveCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getMainCategories: () => Category[];
  getSubCategories: (parentId: string) => Category[];
  clearError: () => void;

  // Real-time methods
  setupRealtimeListeners: () => void;
  cleanupRealtimeListeners: () => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  // Real-time state
  realtimeSubscription: null,
  isRealtimeConnected: false,

  fetchCategories: async () => {
    const { lastFetched } = get();
    const now = new Date();

    // Cache for 10 minutes
    if (lastFetched && now.getTime() - lastFetched.getTime() < 10 * 60 * 1000) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const query = `*[_type == "category"] | order(sortOrder asc, name asc) {
        _id,
        name,
        slug,
        description,
        icon,
        parentCategory->{
          _id,
          name,
          slug
        },
        isActive,
        sortOrder,
        createdAt,
        updatedAt
      }`;

      const categories = await sanityClient.fetch<Category[]>(query);

      set({
        categories,
        isLoading: false,
        lastFetched: now,
        error: null,
      });

      // Setup real-time listeners after initial fetch
      get().setupRealtimeListeners();
    } catch (error) {
      console.error("Error fetching categories:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
      });
    }
  },

  getActiveCategories: () => {
    const { categories } = get();
    return categories.filter((category) => category.isActive);
  },

  getCategoryById: (id) => {
    const { categories } = get();
    return categories.find((category) => category._id === id);
  },

  getCategoryByName: (name) => {
    const { categories } = get();
    return categories.find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    );
  },

  getMainCategories: () => {
    const { categories } = get();
    return categories.filter(
      (category) => category.isActive && !category.parentCategory
    );
  },

  getSubCategories: (parentId) => {
    const { categories } = get();
    return categories.filter(
      (category) =>
        category.isActive && category.parentCategory?._id === parentId
    );
  },

  clearError: () => {
    set({ error: null });
  },

  // Setup Sanity real-time listeners for categories
  setupRealtimeListeners: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) return; // Already connected

    console.log("🔌 Setting up category real-time listeners...");

    const subscription = sanityClient
      .listen('*[_type == "category"]')
      .subscribe({
        next: (update) => {
          console.log("📡 Category real-time update:", update);
          set({ isRealtimeConnected: true });

          const { categories } = get();
          const documentId = update.documentId;
          const document = update.result;

          switch (update.transition) {
            case "appear":
              if (document && !categories.find((c) => c._id === documentId)) {
                set({
                  categories: [...categories, document as unknown as Category],
                });
                console.log(`✅ Category created: ${document.name}`);
              }
              break;

            case "update":
              if (document) {
                const updatedCategories = categories.map((category) =>
                  category._id === documentId
                    ? { ...category, ...document }
                    : category
                );
                set({ categories: updatedCategories });
                console.log(`🔄 Category updated: ${document.name}`);
              }
              break;

            case "disappear":
              const filteredCategories = categories.filter(
                (category) => category._id !== documentId
              );
              set({ categories: filteredCategories });
              console.log(`🗑️ Category deleted: ${documentId}`);
              break;
          }
        },
        error: (error) => {
          console.error("❌ Category real-time error:", error);
          set({ isRealtimeConnected: false });
        },
      });

    set({
      realtimeSubscription: subscription,
      isRealtimeConnected: true,
    });
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
      console.log("❌ Category real-time listeners disconnected");
    }
  },
}));
