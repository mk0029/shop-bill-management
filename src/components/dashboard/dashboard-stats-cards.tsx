import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, FileText, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types";

interface DashboardStatsCardsProps {
  stats: DashboardStats;
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  const statsConfig = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      subtitle: `${stats.totalProducts} total`,
      subtitleColor: "text-green-600",
      icon: Package,
      iconColor: "text-blue-600",
    },
    {
      title: "Total Users",
      value: stats.totalCustomers,
      subtitle: `${stats.totalCustomers} customers`,
      subtitleColor: "text-blue-600",
      icon: Users,
      iconColor: "text-green-600",
    },
    {
      title: "Total Bills",
      value: stats.totalBills,
      subtitle: `${stats.pendingBills} pending`,
      subtitleColor: "text-orange-600",
      icon: FileText,
      iconColor: "text-orange-600",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      subtitle: `${stats.totalBills} total`,
      subtitleColor: "text-green-600",
      icon: TrendingUp,
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statsConfig.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {stat.title}
                </p>
                <p className="text-xl sm:text-2xl font-bold truncate">
                  {stat.value}
                </p>
                <p className={`text-xs ${stat.subtitleColor} truncate`}>
                  {stat.subtitle}
                </p>
              </div>
              <stat.icon
                className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.iconColor} flex-shrink-0 ml-2`}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DashboardStatsCards;
