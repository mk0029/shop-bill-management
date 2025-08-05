import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";

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

  // Actions
  fetchCategories: () => Promise<void>;
  getActiveCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getMainCategories: () => Category[];
  getSubCategories: (parentId: string) => Category[];
  clearError: () => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  lastFetched: null,

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
}));
