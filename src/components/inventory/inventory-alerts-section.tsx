import React from "react";
import { AlertCard } from "@/components/ui/alert-card";
import { TrendingDown, AlertTriangle, TrendingUp } from "lucide-react";
import { StockAlert } from "@/types";

interface InventoryAlertsSectionProps {
  criticalAlerts: StockAlert[];
  warningAlerts: StockAlert[];
  isLoadingAlerts: boolean;
  alertsError: string | null;
}

export function InventoryAlertsSection({
  criticalAlerts,
  warningAlerts,
  isLoadingAlerts,
  alertsError,
}: InventoryAlertsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Critical Alerts */}
      <AlertCard
        title="Critical Stock Alerts"
        alerts={criticalAlerts}
        icon={<TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />}
        badgeVariant="destructive"
        alertClassName="bg-red-900/10 border border-red-800/50"
        isLoading={isLoadingAlerts}
        error={alertsError}
        emptyMessage="No critical stock issues"
      />

      {/* Warning Alerts */}
      <AlertCard
        title="Low Stock Warnings"
        alerts={warningAlerts}
        icon={
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
        }
        badgeVariant="secondary"
        badgeClassName="bg-yellow-600/20 text-yellow-400"
        alertClassName="bg-yellow-900/10 border border-yellow-800/50"
        isLoading={isLoadingAlerts}
        error={alertsError}
        emptyIcon={
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-2" />
        }
        emptyMessage="All stock levels healthy"
      />
    </div>
  );
}

export default InventoryAlertsSection;
