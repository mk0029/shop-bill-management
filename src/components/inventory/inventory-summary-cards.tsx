import React from "react";
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, Package, TrendingDown, AlertTriangle } from "lucide-react";
import { InventoryValue } from "@/types";

interface InventorySummaryCardsProps {
  inventoryValue: InventoryValue | null;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  isLoadingValue: boolean;
  isLoadingAlerts: boolean;
  valueError: string | null;
}

export function InventorySummaryCards({
  inventoryValue,
  criticalAlertsCount,
  warningAlertsCount,
  isLoadingValue,
  isLoadingAlerts,
  valueError,
}: InventorySummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard
        title="Total Value"
        value={`₹${inventoryValue?.totalValue || 0}`}
        icon={DollarSign}
        iconColor="text-green-400"
        iconBgColor="bg-green-600/20"
        isLoading={isLoadingValue}
        error={!!valueError}
      />

      <StatCard
        title="Total Items"
        value={inventoryValue?.totalItems || 0}
        icon={Package}
        iconColor="text-blue-400"
        iconBgColor="bg-blue-600/20"
        isLoading={isLoadingValue}
        error={!!valueError}
      />

      <StatCard
        title="Out of Stock"
        value={criticalAlertsCount}
        icon={TrendingDown}
        iconColor="text-red-400"
        iconBgColor="bg-red-600/20"
        isLoading={isLoadingAlerts}
      />

      <StatCard
        title="Low Stock"
        value={warningAlertsCount}
        icon={AlertTriangle}
        iconColor="text-yellow-400"
        iconBgColor="bg-yellow-600/20"
        isLoading={isLoadingAlerts}
      />
    </div>
  );
}

export default InventorySummaryCards;
