import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";
import { Brand, CreateBrandData } from "@/types";
import type { Subscription } from "rxjs";

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

  // Sync methods
  forceSyncBrands: () => Promise<void>;

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
        // Don't add to local state here - let the realtime listener handle it
        // This prevents duplicates when the realtime "appear" event fires
        set({
          isLoading: false,
          error: null,
        });
        console.log("✅ Brand created in Sanity, waiting for realtime sync...");
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
        // Don't update local state here - let the realtime listener handle it
        // This prevents inconsistencies when the realtime "update" event fires
        set({
          isLoading: false,
          error: null,
        });
        console.log("✅ Brand updated in Sanity, waiting for realtime sync...");
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

      // Don't update local state here - let the realtime listener handle it
      // This prevents inconsistencies when the realtime "disappear" event fires
      set({
        isLoading: false,
        error: null,
      });
      console.log("✅ Brand deleted from Sanity, waiting for realtime sync...");
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

  // Force sync brands from Sanity (useful for resolving inconsistencies)
  forceSyncBrands: async () => {
    console.log("🔄 Force syncing brands from Sanity...");

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
        lastFetched: new Date(),
        error: null,
      });

      console.log(`✅ Force sync completed: ${brands.length} brands loaded`);
    } catch (error) {
      console.error("❌ Force sync failed:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to sync brands",
      });
    }
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
            if (document && document._type === "brand") {
              const { brands } = get();
              const existingBrand = brands.find((b) => b._id === documentId);
              const brandDocument = document as unknown as Brand;

              if (!existingBrand) {
                // Add new brand
                set({ brands: [...brands, brandDocument] });
                console.log(
                  `✅ Brand created via realtime: ${brandDocument.name}`
                );
              } else {
                // Update existing brand (in case of data changes)
                const updatedBrands = brands.map((brand) =>
                  brand._id === documentId
                    ? { ...brand, ...brandDocument }
                    : brand
                );
                set({ brands: updatedBrands });
                console.log(
                  `🔄 Brand updated via realtime appear: ${brandDocument.name}`
                );
              }
            }
            break;

          case "update":
            if (document && document._type === "brand") {
              const { brands } = get();
              const brandDocument = document as unknown as Brand;
              const updatedBrands = brands.map((brand) =>
                brand._id === documentId
                  ? { ...brand, ...brandDocument }
                  : brand
              );
              set({ brands: updatedBrands });
              console.log(
                `🔄 Brand updated via realtime: ${brandDocument.name}`
              );
            }
            break;

          case "disappear":
            const { brands: currentBrands } = get();
            const filteredBrands = currentBrands.filter(
              (brand) => brand._id !== documentId
            );
            set({ brands: filteredBrands });
            console.log(`🗑️ Brand deleted via realtime: ${documentId}`);
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
