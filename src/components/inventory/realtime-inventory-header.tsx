"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp, History } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const formatCurrency = (amount: number) => {
  if (amount < 1000) return `₹${amount.toFixed(0)}`;
  const k = amount / 1000;
  const decimals = k < 10 ? 1 : 0;
  return `₹${k.toFixed(decimals)}K`;
};

interface InventoryHeaderProps {
  onAddProduct: () => void;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  isTechnician?: boolean;
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
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center gap-2.5">
      <div className={`p-1.5 rounded-lg max-sm:hidden ${stat.bg}`}>
        {stat.icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-400">{stat.label}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={value.toString()}
            initial={hasChanged ? { y: -10, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className={`text-base font-bold ${stat.valueClass}`}
          >
            {value}
          </motion.p>
        </AnimatePresence>
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
  isTechnician = false,
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
      label: "Products",
      value: totalProducts,
      prevValue: prevValues.current.totalProducts,
      icon: <Package className="w-4 h-4 text-blue-400" />,
      bg: "bg-blue-600/20",
      valueClass: "text-white",
    },
    ...(!isTechnician
      ? [{
          label: "Value",
          value: formatCurrency(totalValue),
          prevValue: formatCurrency(prevValues.current.totalValue),
          icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
          bg: "bg-green-600/20",
          valueClass: "text-purple-400",
        }]
      : []),
    {
      label: "Low Stock",
      value: lowStockCount,
      prevValue: prevValues.current.lowStockCount,
      icon: <Package className="w-4 h-4 text-yellow-400" />,
      bg: "bg-yellow-600/20",
      valueClass: "text-white",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
      prevValue: prevValues.current.outOfStockCount,
      icon: <Package className="w-4 h-4 text-red-400" />,
      bg: "bg-red-600/20",
      valueClass: "text-white",
    },
  ];
  const router = useRouter();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-white">
          {isTechnician ? "Inventory" : "Inventory"}
        </h1>
        {!isTechnician && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/admin/inventory/history")}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button onClick={onAddProduct} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
