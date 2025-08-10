import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";
import {
  fetchAllSpecificationOptions,
  fetchAllCategoryFieldMappings,
} from "@/lib/sanity-queries";
import { useCategoryStore } from "@/store/category-store";

// Specification option from Sanity
export interface SpecificationOption {
  _id: string;
  type: string;
  value: string;
  label: string;
  categories: Array<{ _ref: string; _type: "reference" }>;
  sortOrder: number;
  isActive: boolean;
  description?: string;
}

// Category field mapping from Sanity
export interface SanityCategoryFieldMapping {
  _id: string;
  category: {
    _id: string;
    name: string;
    slug: { current: string };
  };
  categoryType: "ampere" | "volt-watt" | "wire" | "light" | "general";
  requiredFields: FieldDefinition[];
  optionalFields: FieldDefinition[];
  isActive: boolean;
  description?: string;
}

// Category field mapping types
export interface FieldDefinition {
  _id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: "text" | "number" | "select" | "multiselect" | "boolean" | "date";
  description?: string;
  placeholder?: string;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  defaultValue?: string;
  sortOrder: number;
  isActive: boolean;
  applicableCategories?: Array<{ _ref: string; _type: "reference" }>;
  conditionalLogic?: {
    dependsOn: string;
    condition: string;
    value: string;
  };
}

export interface CategoryFieldMapping {
  categoryType: "ampere" | "volt-watt" | "wire" | "light" | "general";
  requiredFields: FieldDefinition[];
  optionalFields: FieldDefinition[];
}

interface SpecificationsStore {
  // All specification options from Sanity
  specificationOptions: SpecificationOption[];

  // Category field mappings from Sanity
  categoryFieldMappings: SanityCategoryFieldMapping[];

  // Loading states
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Static unit options (these don't need to be in Sanity)
  unitOptions: { value: string; label: string }[];

  // Actions
  init: () => void;
  fetchSpecificationOptions: () => Promise<void>;
  fetchCategoryFieldMappings: () => Promise<void>;

  forceSyncSpecifications: () => Promise<void>;

  // Getters
  getOptionsByCategory: (
    categoryId: string | null,
    optionType: string
  ) => { value: string; label: string }[];
  getOptionsByType: (optionType: string) => SpecificationOption[];
  getOptionLabel: (value: string, optionType: string) => string;
  getCategoryFieldMapping: (categoryId: string | null) => CategoryFieldMapping;
  getRequiredFieldsForCategory: (
    categoryId: string | null
  ) => FieldDefinition[];
  getOptionalFieldsForCategory: (
    categoryId: string | null
  ) => FieldDefinition[];

  // Admin actions
  addSpecificationOption: (
    option: Omit<SpecificationOption, "_id">
  ) => Promise<void>;
  updateSpecificationOption: (
    id: string,
    updates: Partial<SpecificationOption>
  ) => Promise<void>;
  deleteSpecificationOption: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useSpecificationsStore = create<SpecificationsStore>(
  (set, get) => ({
    // Data from Sanity
    specificationOptions: [],
    categoryFieldMappings: [],

    // Loading states
    isLoading: false,
    error: null,
    lastFetched: null,

    // Static unit options (these don't change often)
    unitOptions: [
      { value: "piece", label: "Piece" },
      { value: "meter", label: "Meter" },
      { value: "box", label: "Box" },
      { value: "kg", label: "Kilogram" },
      { value: "set", label: "Set" },
      { value: "roll", label: "Roll" },
      { value: "pack", label: "Pack" },
      { value: "liter", label: "Liter" },
    ],

    // Initializer
    init: () => {
      get().fetchSpecificationOptions();
      get().fetchCategoryFieldMappings();
    },



    forceSyncSpecifications: async () => {
      set({ isLoading: true });
      await get().fetchSpecificationOptions();
      await get().fetchCategoryFieldMappings();
      set({ isLoading: false });
    },

    // Fetch specification options from Sanity
    fetchSpecificationOptions: async () => {
      const { lastFetched } = get();
      const now = new Date();

      // Cache for 5 minutes
      if (
        lastFetched &&
        now.getTime() - lastFetched.getTime() < 5 * 60 * 1000
      ) {
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const options = await fetchAllSpecificationOptions();
        set({
          specificationOptions: options,
          isLoading: false,
          lastFetched: now,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching specification options:", error);
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch specification options",
        });
      }
    },

    // Fetch category field mappings from Sanity
    fetchCategoryFieldMappings: async () => {
      set({ isLoading: true });
      try {
        const query = `*[_type == "categoryFieldMapping" && isActive == true]{..., category->{_id, name, slug}, requiredFields[]->, optionalFields[]->}`;
        const mappings = await sanityClient.fetch(query);
        set({
          categoryFieldMappings: mappings,
          isLoading: false,
          lastFetched: new Date(),
        });
      } catch (error) {
        console.error("Error fetching category field mappings:", error);
        set({ error: "Failed to fetch category field mappings", isLoading: false });
      }
    },

    // Refresh all data
    refreshData: async () => {
      const { fetchSpecificationOptions, fetchCategoryFieldMappings } = get();
      await Promise.all([
        fetchSpecificationOptions(),
        fetchCategoryFieldMappings(),
      ]);
    },

    // Get options by category and type
    getOptionsByCategory: (categoryId: string | null, optionType: string) => {
      const { specificationOptions } = get();

      // Filter options by type first
      const optionsForType = specificationOptions.filter(
        (option) => option.type === optionType && option.isActive
      );

      let finalOptions: SpecificationOption[] = [];

      // Filter by category if a category ID is provided
      if (categoryId) {
        const categorySpecificOptions = optionsForType.filter((option) =>
          option.categories?.some((cat) => cat._ref === categoryId)
        );
        finalOptions.push(...categorySpecificOptions);
      }

      // Also include options that are not linked to any specific category (general options)
      const generalOptions = optionsForType.filter(
        (option) => !option.categories || option.categories.length === 0
      );
      finalOptions.push(...generalOptions);

      // Remove duplicates that might be added if an option is both general and category-specific
      const uniqueOptions = Array.from(
        new Map(finalOptions.map((option) => [option._id, option])).values()
      );

      return uniqueOptions
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((opt) => ({ value: opt.value, label: opt.label }));
    },

    // Get all options by type
    getOptionsByType: (optionType: string) => {
      const { specificationOptions } = get();

      return specificationOptions.filter(
        (option) => option.type === optionType && option.isActive
      );
    },

    // Get option label
    getOptionLabel: (value: string, optionType: string) => {
      const { specificationOptions, unitOptions } = get();

      // Handle unit options separately (static)
      if (optionType === "unit") {
        const found = unitOptions.find((option) => option.value === value);
        return found ? found.label : value;
      }

      // Handle dynamic options from Sanity
      const found = specificationOptions.find(
        (option) => option.type === optionType && option.value === value
      );
      return found ? found.label : value;
    },

    // Get category field mapping by Category ID
    getCategoryFieldMapping: (categoryId: string | null) => {
      const { categoryFieldMappings } = get();

      if (!categoryId) {
        return {
          categoryType: "general",
          requiredFields: [],
          optionalFields: [],
        };
      }

      // Find the specific mapping for this category by matching category._id with categoryId
      const specificMapping = categoryFieldMappings.find(
        (mapping) => mapping.category?._id === categoryId && mapping.isActive
      );

      // If no specific mapping found, return empty
      if (!specificMapping) {
        return {
          categoryType: "general",
          requiredFields: [],
          optionalFields: [],
        };
      }

      // Return all fields from the specific mapping
      return {
        categoryType: specificMapping.categoryType,
        requiredFields: specificMapping.requiredFields || [],
        optionalFields: specificMapping.optionalFields || [],
      };
    },

    // Get required fields for category
    getRequiredFieldsForCategory: (categoryId: string | null) => {
      const { getCategoryFieldMapping } = get();
      return getCategoryFieldMapping(categoryId).requiredFields;
    },

    // Get optional fields for category
    getOptionalFieldsForCategory: (categoryId: string | null) => {
      const { getCategoryFieldMapping } = get();
      return getCategoryFieldMapping(categoryId).optionalFields;
    },

    // Admin actions
    addSpecificationOption: async (
      option: Omit<SpecificationOption, "_id">
    ) => {
      try {
        const newOption = await sanityClient.create({
          _type: "specificationOption",
          ...option,
        });

        // Update local state
        set((state) => ({
          specificationOptions: [...state.specificationOptions, newOption],
        }));
      } catch (error) {
        console.error("Error adding specification option:", error);
        throw error;
      }
    },

    updateSpecificationOption: async (
      id: string,
      updates: Partial<SpecificationOption>
    ) => {
      try {
        const updatedOption = await sanityClient
          .patch(id)
          .set(updates)
          .commit();

        // Update local state
        set((state) => ({
          specificationOptions: state.specificationOptions.map((option) =>
            option._id === id ? { ...option, ...updatedOption } : option
          ),
        }));
      } catch (error) {
        console.error("Error updating specification option:", error);
        throw error;
      }
    },

    deleteSpecificationOption: async (id: string) => {
      try {
        await sanityClient.delete(id);

        // Update local state
        set((state) => ({
          specificationOptions: (state.specificationOptions || []).filter(
            (option) => option._id !== id
          ),
        }));
      } catch (error) {
        console.error("Error deleting specification option:", error);
        throw error;
      }
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
