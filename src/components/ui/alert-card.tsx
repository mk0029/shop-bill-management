import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { RefreshCw, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { StockAlert } from "@/types";

interface AlertCardProps {
  title: string;
  alerts: StockAlert[];
  icon: React.ReactNode;
  badgeVariant?: "destructive" | "secondary" | "default";
  badgeClassName?: string;
  alertClassName?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  maxDisplay?: number;
}

export function AlertCard({
  title,
  alerts,
  icon,
  badgeVariant = "destructive",
  badgeClassName,
  alertClassName,
  isLoading = false,
  error = null,
  emptyIcon,
  emptyMessage = "No alerts",
  maxDisplay = 5,
}: AlertCardProps) {
  const displayAlerts = alerts.slice(0, maxDisplay);
  const remainingCount = alerts.length - maxDisplay;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {icon}
          {title}
          {alerts.length > 0 && (
            <Badge variant={badgeVariant} className={`ml-2 ${badgeClassName}`}>
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            {emptyIcon || (
              <Package className="w-6 h-6 text-green-400 mx-auto mb-2" />
            )}
            <p className="text-green-400">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${alertClassName}`}
              >
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {alert.productName}
                    </p>
                    <p className="text-xs text-gray-400">{alert.brandName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {alert.currentStock} left
                  </p>
                  <p className="text-xs text-gray-400">
                    Min: {alert.minimumStock}
                  </p>
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="text-center text-sm text-gray-400 pt-2">
                +{remainingCount} more alerts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AlertCard;
