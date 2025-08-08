import React from "react";
import { Card, CardContent } from "./card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  isLoading?: boolean;
  error?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  isLoading = false,
  error = false,
}: StatCardProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : error ? (
                <span className="text-red-400 text-sm">Error</span>
              ) : typeof value === "number" ? (
                value.toLocaleString()
              ) : (
                value
              )}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
