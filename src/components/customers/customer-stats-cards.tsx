import { Users, Activity, Receipt, Loader2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { CustomerStats } from "@/types/customer";

interface CustomerStatsCardsProps {
  stats: CustomerStats;
  isLoading: boolean;
}

export default function CustomerStatsCards({
  stats,
  isLoading,
}: CustomerStatsCardsProps) {
  const statsConfig = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      gradient: "from-blue-600 to-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-950/40",
    },
    {
      title: "Active Customers",
      value: stats.activeCustomers,
      icon: Activity,
      gradient: "from-emerald-600 to-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/40",
    },
    {
      title: "Total Bills",
      value: stats.totalBills,
      icon: Receipt,
      gradient: "from-amber-600 to-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsConfig.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`relative overflow-hidden border ${stat.border} ${stat.bg} backdrop-blur-sm`}>
            <div className="absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.03]" />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-50`} />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
