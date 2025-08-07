"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBrandStore } from "@/store/brand-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";

export function RealtimeDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);

  const {
    brands,
    isRealtimeConnected: brandRealtime,
    forceSyncBrands,
    setupRealtimeListeners: setupBrandRealtime,
    cleanupRealtimeListeners: cleanupBrandRealtime,
  } = useBrandStore();

  const { products, refreshData: refreshInventory } = useInventoryStore();

  const { bills, fetchBills } = useSanityBillStore();

  const handleForceSync = async () => {
    console.log("🔄 Starting force sync for all stores...");

    try {
      await Promise.all([forceSyncBrands(), refreshInventory(), fetchBills()]);

      console.log("✅ Force sync completed for all stores");
    } catch (error) {
      console.error("❌ Force sync failed:", error);
    }
  };

  const handleReconnectRealtime = () => {
    console.log("🔌 Reconnecting realtime listeners...");

    // Cleanup and reconnect brand realtime
    cleanupBrandRealtime();
    setTimeout(() => {
      setupBrandRealtime();
    }, 1000);
  };

  const duplicateBrands = brands.filter(
    (brand, index, arr) => arr.findIndex((b) => b.name === brand.name) !== index
  );

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">Realtime Debug</CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white">
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">
              Connection Status
            </h4>
            <div className="flex items-center gap-2">
              {brandRealtime ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <Badge variant={brandRealtime ? "default" : "destructive"}>
                Brands: {brandRealtime ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>

          {/* Data Counts */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Data Counts</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="text-white font-medium">{brands.length}</div>
                <div className="text-gray-400">Brands</div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">{products.length}</div>
                <div className="text-gray-400">Products</div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">{bills.length}</div>
                <div className="text-gray-400">Bills</div>
              </div>
            </div>
          </div>

          {/* Duplicate Detection */}
          {duplicateBrands.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-medium text-yellow-400">
                  Duplicates Detected
                </h4>
              </div>
              <div className="text-sm text-gray-300">
                {duplicateBrands.length} duplicate brand(s) found
              </div>
              <div className="space-y-1">
                {duplicateBrands.map((brand, index) => (
                  <div key={index} className="text-xs text-gray-400">
                    • {brand.name} (ID: {brand._id.slice(-6)})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Actions</h4>
            <div className="space-y-2">
              <Button
                onClick={handleForceSync}
                variant="outline"
                size="sm"
                className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Force Sync All Data
              </Button>

              <Button
                onClick={handleReconnectRealtime}
                variant="outline"
                size="sm"
                className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                <Wifi className="w-4 h-4 mr-2" />
                Reconnect Realtime
              </Button>
            </div>
          </div>

          {/* Debug Info */}
          <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
            <div>
              Window: {typeof window !== "undefined" ? "Client" : "Server"}
            </div>
            <div>Timestamp: {new Date().toLocaleTimeString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
