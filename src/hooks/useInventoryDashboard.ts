import { useState, useEffect, useCallback, useMemo } from "react";
import { useEnhancedInventory } from "./use-enhanced-inventory";
import { StockAlert } from "@/types";

export function useInventoryDashboard() {
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

  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);
  const [showStockHistory, setShowStockHistory] = useState(false);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAlerts();
      refreshInventoryValue();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAlerts, refreshInventoryValue]);

  const refreshData = useCallback(() => {
    refreshAlerts();
    refreshInventoryValue();
  }, [refreshAlerts, refreshInventoryValue]);

  // Categorize alerts
  const alertCategories = useMemo(() => {
    const critical = lowStockAlerts.filter(
      (alert) => alert.alertLevel === "out_of_stock"
    );
    const warning = lowStockAlerts.filter(
      (alert) => alert.alertLevel === "low_stock"
    );
    const reorder = lowStockAlerts.filter(
      (alert) => alert.alertLevel === "reorder_needed"
    );

    return { critical, warning, reorder };
  }, [lowStockAlerts]);

  const isLoading = isLoadingAlerts || isLoadingValue;
  const hasError = alertsError || valueError;

  return {
    // Data
    inventoryValue,
    alertCategories,
    selectedAlert,
    showStockHistory,

    // Loading states
    isLoading,
    isLoadingAlerts,
    isLoadingValue,

    // Error states
    hasError,
    alertsError,
    valueError,

    // Actions
    refreshData,
    setSelectedAlert,
    setShowStockHistory,
  };
}
