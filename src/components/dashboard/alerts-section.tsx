import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { AlertData } from "@/types";

interface AlertsSectionProps {
  alerts: AlertData;
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
  if (alerts.totalAlerts === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
          Alerts ({alerts.totalAlerts})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Inventory Alerts */}
          {alerts.inventory.lowStockCount > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">
                Low Stock Products ({alerts.inventory.lowStockCount})
              </h4>
              <div className="space-y-2">
                {alerts.inventory.lowStock.slice(0, 3).map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 rounded gap-2"
                  >
                    <span className="text-sm truncate flex-1">
                      {product.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-600 text-xs flex-shrink-0"
                    >
                      {product.inventory.currentStock} left
                    </Badge>
                  </div>
                ))}
                {alerts.inventory.lowStock.length > 3 && (
                  <p className="text-sm text-gray-500">
                    +{alerts.inventory.lowStock.length - 3} more products
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Out of Stock */}
          {alerts.inventory.outOfStockCount > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">
                Out of Stock ({alerts.inventory.outOfStockCount})
              </h4>
              <div className="space-y-2">
                {alerts.inventory.outOfStock.slice(0, 3).map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded gap-2"
                  >
                    <span className="text-sm truncate flex-1">
                      {product.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-600 text-xs flex-shrink-0"
                    >
                      Out of Stock
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Payments */}
          {alerts.bills.overdueCount > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">
                Overdue Payments ({alerts.bills.overdueCount})
              </h4>
              <div className="space-y-2">
                {alerts.bills.overdue.slice(0, 3).map((bill) => (
                  <div
                    key={bill._id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded gap-2"
                  >
                    <span className="text-sm truncate flex-1">
                      {bill.billNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-600 text-xs flex-shrink-0"
                    >
                      ₹{bill.balanceAmount}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertsSection;
