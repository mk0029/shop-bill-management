"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";
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
    setupRealtimeListeners: setupDataRealtime,
    cleanupRealtimeListeners: cleanupDataRealtime,
    isRealtimeConnected: isDataConnected,
  } = useDataStore();

  const { role, user } = useAuthStore();

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

  const initKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const initializeAllStores = async () => {
      try {
        if (!role) return; // wait until role known

        const u = user as any;
        const userId = u?.id || u?._id || "";
        const customerId = u?.customerId || "";
        const initKey = `${role}:${userId}:${customerId}`;
        if (initKeyRef.current === initKey) return;
        initKeyRef.current = initKey;

        if (role === "admin") {
          // DataProvider owns the global data bootstrap. This provider only
          // starts realtime listeners and store-specific metadata loads.
          await Promise.all([fetchBrands(), fetchCategories()]);
        }

        // Start realtime listeners after initial load
        setupDataRealtime();
        if (role === "admin") {
          setupBrandRealtime();
          setupCategoryRealtime();
        }

        // Initialize inventory realtime only for admin flows
        if (role === "admin") {
          initInventoryRealtime();
        }

        // Show success toast when all connections are established
        const checkConnections = () => {
          const expectBrandsCats = role === "admin";
          const allReady = expectBrandsCats
            ? isDataConnected && isBrandConnected && isCategoryConnected
            : isDataConnected;
          if (allReady) {
            toast("🟢 Sanity Real-time Connected", {
              description: "All data will sync automatically across devices",
              duration: 3000,
            });
          }
        };

        // Check connections after a short delay
        setTimeout(checkConnections, 1000);
      } catch (error) {
        console.error("❌ Failed to initialize stores:", error);
        toast("🔴 Connection Error", {
          description: "Some real-time features may not work properly",
          duration: 5000,
        });
      }
    };

    initializeAllStores();

    // Cleanup on unmount
    return () => {
      cleanupDataRealtime();
      cleanupBrandRealtime();
      cleanupCategoryRealtime();
      cleanupInventoryRealtime();
    };
  }, [role, user?.id, (user as any)?.customerId]);

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
        }
      >
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
