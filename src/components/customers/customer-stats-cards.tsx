import { Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocaleStore } from "@/store/locale-store";
import type { CustomerStats } from "@/types/customer";

interface CustomerStatsCardsProps {
  stats: CustomerStats;
  isLoading: boolean;
}

export default function CustomerStatsCards({
  stats,
  isLoading,
}: CustomerStatsCardsProps) {
  const { currency } = useLocaleStore();

  const statsConfig = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "blue",
    },
    {
      title: "Active Customers",
      value: stats.activeCustomers,
      icon: Users,
      color: "green",
    },
    {
      title: "Total Bills",
      value: stats.totalBills,
      icon: Users,
      color: "yellow",
    },
   
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-600/20 text-blue-400",
      green: "bg-green-600/20 text-green-400",
      yellow: "bg-yellow-600/20 text-yellow-400",
      purple: "bg-purple-600/20 text-purple-400",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6 sm:gap-4 gap-3">
      {statsConfig.map((stat, index) => (
        <Card key={index} className="sm:p-4 p-3 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(
                stat.color
              )}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-sm text-gray-400">{stat.title}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
