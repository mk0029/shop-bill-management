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
      value: stats.products.total,
      subtitle: `${stats.products.active} active`,
      subtitleColor: "text-green-600",
      icon: Package,
      iconColor: "text-blue-600",
    },
    {
      title: "Total Users",
      value: stats.users.total,
      subtitle: `${stats.users.customers} customers`,
      subtitleColor: "text-blue-600",
      icon: Users,
      iconColor: "text-green-600",
    },
    {
      title: "Total Bills",
      value: stats.bills.total,
      subtitle: `${stats.bills.pending} pending`,
      subtitleColor: "text-orange-600",
      icon: FileText,
      iconColor: "text-orange-600",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.bills.totalRevenue.toLocaleString()}`,
      subtitle: `${stats.bills.completed} completed`,
      subtitleColor: "text-green-600",
      icon: TrendingUp,
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsConfig.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className={`text-xs ${stat.subtitleColor}`}>
                  {stat.subtitle}
                </p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DashboardStatsCards;
