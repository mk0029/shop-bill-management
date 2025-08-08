/**
 * Enhanced Inventory Dashboard
 * Comprehensive inventory management with real-time stock tracking
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useInventoryDashboard } from "@/hooks/useInventoryDashboard";
import { InventorySummaryCards } from "./inventory-summary-cards";
import { InventoryAlertsSection } from "./inventory-alerts-section";
import { TopValueProducts } from "./top-value-products";
import { QuickActionsPanel } from "./quick-actions-panel";

interface InventoryDashboardProps {
  className?: string;
}

export function InventoryDashboard({
  className = "",
}: InventoryDashboardProps) {
  const {
    inventoryValue,
    alertCategories,
    isLoading,
    isLoadingAlerts,
    isLoadingValue,
    alertsError,
    valueError,
    refreshData,
    setShowStockHistory,
  } = useInventoryDashboard();

  const handleQuickActions = {
    onCreatePurchaseOrder: () => console.log("Create Purchase Order"),
    onBulkStockUpdate: () => console.log("Bulk Stock Update"),
    onViewStockHistory: () => setShowStockHistory(true),
    onGenerateReport: () => console.log("Generate Report"),
  };

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
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <InventorySummaryCards
        inventoryValue={inventoryValue}
        criticalAlertsCount={alertCategories.critical.length}
        warningAlertsCount={alertCategories.warning.length}
        isLoadingValue={isLoadingValue}
        isLoadingAlerts={isLoadingAlerts}
        valueError={valueError}
      />

      {/* Stock Alerts */}
      <InventoryAlertsSection
        criticalAlerts={alertCategories.critical}
        warningAlerts={alertCategories.warning}
        isLoadingAlerts={isLoadingAlerts}
        alertsError={alertsError}
      />

      {/* Top Value Products */}
      <TopValueProducts inventoryValue={inventoryValue} />

      {/* Quick Actions */}
      <QuickActionsPanel {...handleQuickActions} />
    </div>
  );
}
