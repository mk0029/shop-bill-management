"use client";

import { useEffect, useState } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

// Helper: Currency formatter
const formatCurrency = (amount: number) => {
  if (amount < 1000) return `₹${amount}`;
  const k = amount / 1000;
  const decimals = k < 10 ? 2 : k < 100 ? 1 : 0;
  return `₹${k.toFixed(decimals)}K`;
};

export const RealtimeInventoryStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  const { products: storeProducts = [], fetchProducts } = useInventoryStore();
  const [products, setProducts] = useState(storeProducts);

  useEffect(() => {
    if (storeProducts.length === 0) fetchProducts();
  }, []);

  useEffect(() => {
    setProducts(storeProducts);
  }, [storeProducts]);

  useDocumentListener("product", undefined, (update) => {
    const { transition, result } = update;

    setProducts((prev) => {
      switch (transition) {
        case "appear":
          return prev.find((p) => p._id === result._id)
            ? prev
            : [...prev, result];
        case "update":
          return prev.map((p) =>
            p._id === result._id ? { ...p, ...result } : p
          );
        case "disappear":
          return prev.filter((p) => p._id !== result._id);
        default:
          return prev;
      }
    });
  });

  useEffect(() => {
    const newStats = products.reduce(
      (acc, product) => {
        acc.total++;
        if (product.isActive) acc.active++;
        if (product.inventory.currentStock <= 0) acc.outOfStock++;
        else if (
          product.inventory.currentStock <= product.inventory.minimumStock
        )
          acc.lowStock++;
        acc.totalValue +=
          product.inventory.currentStock * product.pricing.purchasePrice;
        return acc;
      },
      {
        total: 0,
        active: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
      }
    );

    setStats(newStats);
  }, [products]);

  // 🧠 Stat card config (icon + color)
  const statCards = [
    {
      title: "Total Products",
      value: stats.total,
      icon: <Package className="h-6 w-6 sm:w-8 sm:h-8 text-blue-400" />,
      valueClass: "text-white",
    },
    {
      title: "Active",
      value: stats.active,
      icon: <Package className="h-6 w-6 sm:w-8 sm:h-8 text-green-400" />,
      valueClass: "text-green-400",
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: <AlertTriangle className="h-6 w-6 sm:w-8 sm:h-8 text-yellow-400" />,
      valueClass: "text-yellow-400",
    },
    {
      title: "Out of Stock",
      value: stats.outOfStock,
      icon: <Package className="h-6 w-6 sm:w-8 sm:h-8 text-red-400" />,
      valueClass: "text-red-400",
    },
    {
      title: (
        <div className="flex sm:block gap-1 sm:gap-0">
          <span className="text-gray-300 text-xs sm:text-sm font-medium">
            Total Value
          </span>
          <span className="text-xs text-gray-400 md:absolute md:w-full md:-bottom-4 md:left-0">
            (at purchase price)
          </span>
        </div>
      ),
      value: formatCurrency(stats.totalValue),
      icon: <TrendingUp className="h-6 w-6 sm:w-8 sm:h-8 text-purple-400" />,
      valueClass: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 sm:gap-4 gap-3">
      {statCards.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardContent>
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    {stat.title}
                  </p>
                  <p
                    className={`text-xl md:text-2xl font-bold !leading-[125%] mt-1 ${stat.valueClass}`}
                  >
                    {stat.value}
                  </p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
