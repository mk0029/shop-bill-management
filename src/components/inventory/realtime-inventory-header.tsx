import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";

// Helper: Currency formatter
const formatCurrency = (amount: number) => {
  if (amount < 1000) return `₹${amount.toFixed(2)}`;
  const k = amount / 1000;
  const decimals = k < 10 ? 2 : k < 100 ? 1 : 0;
  return `₹${k.toFixed(decimals)}K`;
};

interface InventoryHeaderProps {
  onAddProduct: () => void;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const StatCard = ({
  stat,
  value,
  prevValue,
}: {
  stat: any;
  value: number | string;
  prevValue: number | string;
}) => {
  const hasChanged = value !== prevValue;

  return (
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex items-center">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`p-1 sm:p-2 rounded-lg max-sm:hidden ${stat.bg}`}>
          {stat.icon}
        </div>
        <div>
          <p className="text-sm text-gray-400">{stat.label}</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={value.toString()}
              initial={hasChanged ? { y: -20, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className={`text-xl font-semibold ${stat.valueClass}`}>
              {value}
            </motion.p>
          </AnimatePresence>
          {stat.subText && (
            <p className="text-xs text-gray-500">{stat.subText}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const RealtimeInventoryHeader = ({
  onAddProduct,
  totalProducts,
  totalValue,
  lowStockCount,
  outOfStockCount,
}: InventoryHeaderProps) => {
  const prevValues = useRef({
    totalProducts,
    totalValue,
    lowStockCount,
    outOfStockCount,
  });

  useEffect(() => {
    prevValues.current = {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [totalProducts, totalValue, lowStockCount, outOfStockCount]);

  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      prevValue: prevValues.current.totalProducts,
      icon: <Package className="w-5 h-5 text-blue-400" />,
      bg: "bg-blue-600/20",
      valueClass: "text-white",
    },
    {
      label: "Total Value",
      value: formatCurrency(totalValue),
      prevValue: formatCurrency(prevValues.current.totalValue),
      subText: "(at purchase price)",
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      bg: "bg-green-600/20",
      valueClass: "text-purple-400",
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      prevValue: prevValues.current.lowStockCount,
      icon: <Package className="w-5 h-5 text-yellow-400" />,
      bg: "bg-yellow-600/20",
      valueClass: "text-white",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
      prevValue: prevValues.current.outOfStockCount,
      icon: <Package className="w-5 h-5 text-red-400" />,
      bg: "bg-red-600/20",
      valueClass: "text-white",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Manage your product inventory and stock levels
          </p>
        </div>
        <Button
          onClick={onAddProduct}
          className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="max-sm:hidden"> Add Product</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            stat={stat}
            value={stat.value}
            prevValue={stat.prevValue}
          />
        ))}
      </div>
    </div>
  );
};
