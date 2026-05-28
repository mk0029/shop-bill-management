/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp, PackagePlus, History } from "lucide-react";
import { useEffect, useRef } from "react";
import ResponsiveAccordion from "../ui/responsive-accordion";
import { useRouter } from "next/navigation";

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
              className={`text-xl font-semibold ${stat.valueClass}`}
            >
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
      label: "Total Products",
      value: totalProducts,
      prevValue: prevValues.current.totalProducts,
      icon: <Package className="w-5 h-5 text-blue-400" />,
      bg: "bg-blue-600/20",
      valueClass: "text-white",
    },
    ...(!isTechnician
      ? [{
          label: "Total Value",
          value: formatCurrency(totalValue),
          prevValue: formatCurrency(prevValues.current.totalValue),
          subText: "(at purchase price)",
          icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
          bg: "bg-green-600/20",
          valueClass: "text-purple-400",
        }]
      : []),
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
  const router = useRouter();

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            {isTechnician ? "Inventory" : "Inventory Management"}
          </h1>
        </div>
        {!isTechnician && (
          <div className="flex items-center gap-2 justify-end">
            <Button
              onClick={() => {
                router.push("/admin/inventory/history");
              }}
              className=" w-full"
              variant="outline"
            >
              <History className="w-4 h-4 mr-2" />
              Stoke History
            </Button>
            <Button onClick={onAddProduct} className=" w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Products
            </Button>
          </div>
        )}
      </div>
      <ResponsiveAccordion title="Inventory">
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
      </ResponsiveAccordion>
    </div>
  );
};
