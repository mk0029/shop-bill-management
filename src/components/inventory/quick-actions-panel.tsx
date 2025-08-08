import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ShoppingCart, Package, History, BarChart3 } from "lucide-react";

interface QuickActionsPanelProps {
  onCreatePurchaseOrder?: () => void;
  onBulkStockUpdate?: () => void;
  onViewStockHistory?: () => void;
  onGenerateReport?: () => void;
}

export function QuickActionsPanel({
  onCreatePurchaseOrder,
  onBulkStockUpdate,
  onViewStockHistory,
  onGenerateReport,
}: QuickActionsPanelProps) {
  const actions = [
    {
      icon: ShoppingCart,
      label: "Create Purchase Order",
      onClick: onCreatePurchaseOrder,
    },
    {
      icon: Package,
      label: "Bulk Stock Update",
      onClick: onBulkStockUpdate,
    },
    {
      icon: History,
      label: "Stock History",
      onClick: onViewStockHistory,
    },
    {
      icon: BarChart3,
      label: "Generate Report",
      onClick: onGenerateReport,
    },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-center gap-2 min-h-[80px] sm:min-h-[88px] touch-manipulation"
              onClick={action.onClick}
            >
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-center leading-tight">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickActionsPanel;
