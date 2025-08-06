"use client";

import { useEffect } from "react";
import { useDataStore } from "@/store/data-store";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useToast } from "@/hooks/use-toast";

interface SanityRealtimeProviderProps {
  children: React.ReactNode;
}

export function SanityRealtimeProvider({
  children,
}: SanityRealtimeProviderProps) {
  const {
    loadInitialData,
    setupRealtimeListeners: setupDataRealtime,
    cleanupRealtimeListeners: cleanupDataRealtime,
    isRealtimeConnected: isDataConnected,
  } = useDataStore();

  const {
    fetchBrands,
    setupRealtimeListeners: setupBrandRealtime,
    cleanupRealtimeListeners: cleanupBrandRealtime,
    isRealtimeConnected: isBrandConnected,
  } = useBrandStore();

  const {
    fetchCategories,
    setupRealtimeListeners: setupCategoryRealtime,
    cleanupRealtimeListeners: cleanupCategoryRealtime,
    isRealtimeConnected: isCategoryConnected,
  } = useCategoryStore();

  const {
    initializeRealtime: initInventoryRealtime,
    cleanupRealtime: cleanupInventoryRealtime,
  } = useInventoryStore();

  const { toast } = useToast();

  useEffect(() => {
    const initializeAllStores = async () => {
      console.log("🚀 Initializing all stores with Sanity real-time...");

      try {
        // Load initial data for all stores
        await Promise.all([
          loadInitialData(),
          fetchBrands(),
          fetchCategories(),
        ]);

        // Initialize inventory real-time (uses the sanity realtime store)
        initInventoryRealtime();

        console.log("✅ All stores initialized with real-time capabilities");

        // Show success toast when all connections are established
        const checkConnections = () => {
          if (isDataConnected && isBrandConnected && isCategoryConnected) {
            toast({
              title: "🟢 Sanity Real-time Connected",
              description: "All data will sync automatically across devices",
              duration: 3000,
            });
          }
        };

        // Check connections after a short delay
        setTimeout(checkConnections, 1000);
      } catch (error) {
        console.error("❌ Failed to initialize stores:", error);
        toast({
          title: "🔴 Connection Error",
          description: "Some real-time features may not work properly",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    initializeAllStores();

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up all real-time connections...");
      cleanupDataRealtime();
      cleanupBrandRealtime();
      cleanupCategoryRealtime();
      cleanupInventoryRealtime();
    };
  }, []);

  return <>{children}</>;
}

// Connection status indicator component
export function SanityRealtimeStatus() {
  const { isRealtimeConnected: isDataConnected } = useDataStore();
  const { isRealtimeConnected: isBrandConnected } = useBrandStore();
  const { isRealtimeConnected: isCategoryConnected } = useCategoryStore();

  const allConnected =
    isDataConnected && isBrandConnected && isCategoryConnected;
  const someConnected =
    isDataConnected || isBrandConnected || isCategoryConnected;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          allConnected
            ? "bg-green-500"
            : someConnected
            ? "bg-yellow-500"
            : "bg-red-500"
        }`}
      />
      <span
        className={
          allConnected
            ? "text-green-600"
            : someConnected
            ? "text-yellow-600"
            : "text-red-600"
        }>
        {allConnected
          ? "All Systems Live"
          : someConnected
          ? "Partially Connected"
          : "Connecting..."}
      </span>
    </div>
  );
}

// Detailed connection status for debugging
export function DetailedRealtimeStatus() {
  const { isRealtimeConnected: isDataConnected } = useDataStore();
  const { isRealtimeConnected: isBrandConnected } = useBrandStore();
  const { isRealtimeConnected: isCategoryConnected } = useCategoryStore();

  return (
    <div className="space-y-2 text-sm">
      <div className="font-semibold">Sanity Real-time Status:</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isDataConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>
            Data Store: {isDataConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isBrandConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>Brands: {isBrandConnected ? "Connected" : "Disconnected"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCategoryConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>
            Categories: {isCategoryConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
