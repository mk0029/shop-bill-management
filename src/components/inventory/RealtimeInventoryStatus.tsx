"use client";

import { useEffect } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";

export function RealtimeInventoryStatus() {
  const {
    products,
    inventorySummary,
    fetchProducts,
    fetchInventorySummary,
    getLowStockProducts,
    getOutOfStockProducts,
  } = useInventoryStore();

  // Listen for real-time inventory updates
  useRealtimeEvent("inventory:updated", (data) => {
    console.log("🔔 Inventory updated:", data.productId);
    // Refresh inventory data
    fetchProducts?.();
    fetchInventorySummary?.();
  });

  useRealtimeEvent("inventory:low_stock", (data) => {
    console.log("🔔 Low stock alert:", data.productName);
    // You could show a toast notification here
  });

  useEffect(() => {
    fetchProducts?.();
    fetchInventorySummary?.();
  }, []);

  const lowStockProducts = getLowStockProducts();
  const outOfStockProducts = getOutOfStockProducts();

  return (
    <div className="space-y-4">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">
                  {inventorySummary?.totalProducts || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-green-600">
                  {inventorySummary?.activeProducts || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">
                  {lowStockProducts.length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {outOfStockProducts.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <TrendingDown className="h-5 w-5" />
              Low Stock Alerts ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {product.brand.name} • {product.category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-600">
                      {product.inventory.currentStock} {product.pricing.unit}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Min: {product.inventory.minimumStock}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{lowStockProducts.length - 5} more products with low stock
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out of Stock Alerts */}
      {outOfStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Out of Stock ({outOfStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outOfStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {product.brand.name} • {product.category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-600">
                      0 {product.pricing.unit}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Reorder: {product.inventory.reorderLevel}
                    </p>
                  </div>
                </div>
              ))}
              {outOfStockProducts.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{outOfStockProducts.length - 5} more products out of stock
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
