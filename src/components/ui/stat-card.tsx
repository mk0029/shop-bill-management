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
      <CardContent className="sm:p-4 p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-400  text-xs sm:text-sm font-medium truncate">
              {title}
            </p>
            <p className="text-xl sm:text-xl md:text-2xl font-bold text-white sm:mt-1 truncate">
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
              <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}
          >
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
