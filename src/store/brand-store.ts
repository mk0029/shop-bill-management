import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";
import { Brand, CreateBrandData } from "@/types";
import type { Subscription } from "@sanity/client";

interface BrandStore {
  brands: Brand[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Real-time connection
  realtimeSubscription: Subscription | null;
  isRealtimeConnected: boolean;

  // Actions
  fetchBrands: () => Promise<void>;
  addBrand: (brand: CreateBrandData) => Promise<boolean>;
  updateBrand: (id: string, updates: Partial<Brand>) => Promise<boolean>;
  deleteBrand: (id: string) => Promise<boolean>;
  getActiveBrands: () => Brand[];
  getBrandById: (id: string) => Brand | undefined;
  getBrandBySlug: (slug: string) => Brand | undefined;
  clearError: () => void;

  // Real-time methods
  setupRealtimeListeners: () => void;
  cleanupRealtimeListeners: () => void;
}

export const useBrandStore = create<BrandStore>((set, get) => ({
  brands: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  // Real-time state
  realtimeSubscription: null,
  isRealtimeConnected: false,

  fetchBrands: async () => {
    const { lastFetched } = get();
    const now = new Date();

    // Cache for 5 minutes
    if (lastFetched && now.getTime() - lastFetched.getTime() < 5 * 60 * 1000) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const query = `*[_type == "brand"] | order(name asc) {
        _id,
        _type,
        name,
        slug,
        logo,
        description,
        contactInfo,
        isActive,
        createdAt,
        updatedAt
      }`;

      const brands = await sanityClient.fetch<Brand[]>(query);

      set({
        brands,
        isLoading: false,
        lastFetched: now,
        error: null,
      });

      // Setup real-time listeners after initial fetch
      get().setupRealtimeListeners();
    } catch (error) {
      console.error("Error fetching brands:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch brands",
      });
    }
  },

  addBrand: async (brandData) => {
    set({ isLoading: true, error: null });

    try {
      const newBrand = {
        _type: "brand",
        name: brandData.name,
        slug: {
          current: brandData.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
        description: brandData.description,
        contactInfo: brandData.contactInfo,
        isActive: brandData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await sanityClient.create(newBrand);

      if (result) {
        const { brands } = get();
        set({
          brands: [...brands, result as Brand],
          isLoading: false,
          error: null,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding brand:", error);

      let errorMessage = "Failed to add brand";
      if (error instanceof Error) {
        if (error.message.includes("Insufficient permissions")) {
          errorMessage =
            'Permission denied: Your API token needs "Editor" or "Admin" permissions. Please update your Sanity API token in .env.local';
        } else if (error.message.includes("403")) {
          errorMessage =
            "Access forbidden: Please check your Sanity API token permissions";
        } else {
          errorMessage = error.message;
        }
      }

      set({
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  },

  updateBrand: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const result = await sanityClient
        .patch(id)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      if (result) {
        const { brands } = get();
        const updatedBrands = brands.map((brand) =>
          brand._id === id ? { ...brand, ...updates } : brand
        );

        set({
          brands: updatedBrands,
          isLoading: false,
          error: null,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating brand:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to update brand",
      });
      return false;
    }
  },

  deleteBrand: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await sanityClient.delete(id);

      const { brands } = get();
      const filteredBrands = brands.filter((brand) => brand._id !== id);

      set({
        brands: filteredBrands,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error) {
      console.error("Error deleting brand:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to delete brand",
      });
      return false;
    }
  },

  getActiveBrands: () => {
    const { brands } = get();
    return brands.filter((brand) => brand.isActive);
  },

  getBrandById: (id) => {
    const { brands } = get();
    return brands.find((brand) => brand._id === id);
  },

  getBrandBySlug: (slug) => {
    const { brands } = get();
    return brands.find((brand) => brand.slug.current === slug);
  },

  clearError: () => {
    set({ error: null });
  },

  // Setup Sanity real-time listeners for brands
  setupRealtimeListeners: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) return; // Already connected

    console.log("🔌 Setting up brand real-time listeners...");

    const subscription = sanityClient.listen('*[_type == "brand"]').subscribe({
      next: (update) => {
        console.log("📡 Brand real-time update:", update);
        set({ isRealtimeConnected: true });

        const { brands } = get();
        const documentId = update.documentId;
        const document = update.result;

        switch (update.transition) {
          case "appear":
            if (document && !brands.find((b) => b._id === documentId)) {
              set({ brands: [...brands, document] });
              console.log(`✅ Brand created: ${document.name}`);
            }
            break;

          case "update":
            if (document) {
              const updatedBrands = brands.map((brand) =>
                brand._id === documentId ? { ...brand, ...document } : brand
              );
              set({ brands: updatedBrands });
              console.log(`🔄 Brand updated: ${document.name}`);
            }
            break;

          case "disappear":
            const filteredBrands = brands.filter(
              (brand) => brand._id !== documentId
            );
            set({ brands: filteredBrands });
            console.log(`🗑️ Brand deleted: ${documentId}`);
            break;
        }
      },
      error: (error) => {
        console.error("❌ Brand real-time error:", error);
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
      console.log("❌ Brand real-time listeners disconnected");
    }
  },
}));
