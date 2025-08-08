/**
 * Enhanced Inventory Dashboard
 * Comprehensive inventory management with real-time stock tracking
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnhancedInventory } from "@/hooks/use-enhanced-inventory";
import {
  StockValidationDisplay,
  ProductStockStatus,
  ProductPriceDisplay,
} from "./stock-validation-display";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  RefreshCw,
  Eye,
  History,
  ShoppingCart,
  Zap,
} from "lucide-react";

interface InventoryDashboardProps {
  className?: string;
}

export function InventoryDashboard({
  className = "",
}: InventoryDashboardProps) {
  const {
    lowStockAlerts,
    inventoryValue,
    refreshAlerts,
    refreshInventoryValue,
    isLoadingAlerts,
    isLoadingValue,
    alertsError,
    valueError,
  } = useEnhancedInventory();

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showStockHistory, setShowStockHistory] = useState(false);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAlerts();
      refreshInventoryValue();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAlerts, refreshInventoryValue]);

  const criticalAlerts = lowStockAlerts.filter(
    (alert) => alert.alertLevel === "out_of_stock"
  );
  const warningAlerts = lowStockAlerts.filter(
    (alert) => alert.alertLevel === "low_stock"
  );
  const reorderAlerts = lowStockAlerts.filter(
    (alert) => alert.alertLevel === "reorder_needed"
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventory Dashboard</h2>
          <p className="text-gray-400 mt-1">
            Real-time stock monitoring and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshAlerts();
              refreshInventoryValue();
            }}
            disabled={isLoadingAlerts || isLoadingValue}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                isLoadingAlerts || isLoadingValue ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Inventory Value */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {isLoadingValue ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : valueError ? (
                    <span className="text-red-400 text-sm">Error</span>
                  ) : (
                    `₹${inventoryValue?.totalValue.toLocaleString() || 0}`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Items</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {isLoadingValue ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    inventoryValue?.totalItems.toLocaleString() || 0
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {isLoadingAlerts ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    criticalAlerts.length
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Alerts */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {isLoadingAlerts ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    warningAlerts.length
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Critical Stock Alerts
              {criticalAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {criticalAlerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlerts ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                <p className="text-gray-400">Loading alerts...</p>
              </div>
            ) : alertsError ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-red-400">{alertsError}</p>
              </div>
            ) : criticalAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-green-400">No critical stock issues</p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-900/10 border border-red-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {alert.productName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {alert.brandName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-400 font-medium">
                        {alert.currentStock} left
                      </p>
                      <p className="text-xs text-gray-400">
                        Min: {alert.minimumStock}
                      </p>
                    </div>
                  </div>
                ))}
                {criticalAlerts.length > 5 && (
                  <p className="text-center text-sm text-gray-400 pt-2">
                    +{criticalAlerts.length - 5} more critical alerts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning Alerts */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Low Stock Warnings
              {warningAlerts.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-yellow-600/20 text-yellow-400"
                >
                  {warningAlerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warningAlerts.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-green-400">All stock levels healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {warningAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-yellow-900/10 border border-yellow-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {alert.productName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {alert.brandName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-400 font-medium">
                        {alert.currentStock} left
                      </p>
                      <p className="text-xs text-gray-400">
                        Min: {alert.minimumStock}
                      </p>
                    </div>
                  </div>
                ))}
                {warningAlerts.length > 5 && (
                  <p className="text-center text-sm text-gray-400 pt-2">
                    +{warningAlerts.length - 5} more warnings
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Value Products */}
      {inventoryValue && inventoryValue.breakdown.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Top Value Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryValue.breakdown.slice(0, 10).map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {product.brand} • {product.stock} {product.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-400">
                      ₹{product.totalValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      ₹{product.unitPrice}/{product.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm">Create Purchase Order</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Package className="w-5 h-5" />
              <span className="text-sm">Bulk Stock Update</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <History className="w-5 h-5" />
              <span className="text-sm">Stock History</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
