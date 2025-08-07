"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  brand?: { name: string };
  category?: { name: string };
  pricing: {
    sellingPrice: number;
    purchasePrice: number;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
  };
  isActive: boolean;
  updatedAt: string;
}

interface RealtimeInventoryProps {
  initialProducts: Product[];
  showLowStockOnly?: boolean;
  maxItems?: number;
  onProductClick?: (product: Product) => void;
}

export const RealtimeInventory: React.FC<RealtimeInventoryProps> = ({
  initialProducts,
  showLowStockOnly = false,
  maxItems,
  onProductClick,
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [updatedProductIds, setUpdatedProductIds] = useState<Set<string>>(
    new Set()
  );

  // Listen to product changes
  useDocumentListener("product", undefined, (update) => {
    const { transition, result, previous } = update;

    switch (transition) {
      case "appear":
        setProducts((prev) => {
          const exists = prev.find((p) => p._id === result._id);
          if (!exists) {
            toast.success(`New product added: ${result.name}`);
            return [result, ...prev];
          }
          return prev;
        });
        break;

      case "update":
        setProducts((prev) =>
          prev.map((product) => {
            if (product._id === result._id) {
              // Check for stock changes
              const stockChanged =
                previous?.inventory?.currentStock !==
                result.inventory?.currentStock;
              if (stockChanged) {
                const stockDiff =
                  result.inventory.currentStock -
                  (previous?.inventory?.currentStock || 0);
                const isIncrease = stockDiff > 0;

                // Highlight updated product
                setUpdatedProductIds((prev) => new Set(prev).add(result._id));
                setTimeout(() => {
                  setUpdatedProductIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(result._id);
                    return newSet;
                  });
                }, 2000);

                // Show notification
                toast.info(
                  `Stock ${isIncrease ? "increased" : "decreased"} for ${
                    result.name
                  }: ${Math.abs(stockDiff)} units`,
                  {
                    icon: isIncrease ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    ),
                  }
                );

                // Check for low stock
                if (
                  result.inventory.currentStock <= result.inventory.minimumStock
                ) {
                  toast.warning(
                    `Low stock alert: ${result.name} (${result.inventory.currentStock} remaining)`
                  );
                }
              }

              return { ...product, ...result };
            }
            return product;
          })
        );
        break;

      case "disappear":
        setProducts((prev) =>
          prev.filter((product) => product._id !== result._id)
        );
        toast.error(`Product removed: ${result.name}`);
        break;
    }
  });

  // Filter products based on props
  const filteredProducts = products.filter((product) => {
    if (showLowStockOnly) {
      return product.inventory.currentStock <= product.inventory.minimumStock;
    }
    return true;
  });

  const displayProducts = maxItems
    ? filteredProducts.slice(0, maxItems)
    : filteredProducts;

  const getStockStatus = (product: Product) => {
    const { currentStock, minimumStock, maximumStock } = product.inventory;
    const stockPercentage = (currentStock / maximumStock) * 100;

    if (currentStock <= 0) {
      return {
        status: "out-of-stock",
        color: "bg-red-500",
        textColor: "text-red-400",
      };
    } else if (currentStock <= minimumStock) {
      return {
        status: "low-stock",
        color: "bg-yellow-500",
        textColor: "text-yellow-400",
      };
    } else if (stockPercentage >= 80) {
      return {
        status: "high-stock",
        color: "bg-green-500",
        textColor: "text-green-400",
      };
    } else {
      return {
        status: "normal",
        color: "bg-blue-500",
        textColor: "text-blue-400",
      };
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {displayProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          const isUpdated = updatedProductIds.has(product._id);
          const stockPercentage = Math.min(
            (product.inventory.currentStock / product.inventory.maximumStock) *
              100,
            100
          );

          return (
            <motion.div
              key={product._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isUpdated ? [1, 1.02, 1] : 1,
                boxShadow: isUpdated
                  ? "0 0 20px rgba(34, 197, 94, 0.3)"
                  : "none",
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`relative ${isUpdated ? "ring-2 ring-green-500" : ""}`}
            >
              {isUpdated && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-2 -right-2 z-10"
                >
                  <Badge className="bg-green-600 text-white flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Updated
                  </Badge>
                </motion.div>
              )}

              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-400" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">
                            {product.name}
                          </h3>
                          {product.inventory.currentStock <=
                            product.inventory.minimumStock && (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>

                        <p className="text-sm text-gray-400">
                          {product.brand?.name} • {product.category?.name}
                        </p>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>
                                Stock: {product.inventory.currentStock}
                              </span>
                              <span>Max: {product.inventory.maximumStock}</span>
                            </div>
                            <Progress
                              value={stockPercentage}
                              className="h-2"
                              indicatorClassName={stockStatus.color}
                            />
                          </div>

                          <Badge
                            className={`${stockStatus.textColor} bg-gray-700`}
                          >
                            {stockStatus.status.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          ₹{product.pricing.sellingPrice.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          Cost: ₹
                          {product.pricing.purchasePrice.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onProductClick?.(product)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {displayProducts.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {showLowStockOnly ? "No low stock items" : "No products found"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {showLowStockOnly
                ? "All products are well stocked"
                : "Products will appear here in real-time"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Real-time inventory stats component
export const RealtimeInventoryStats: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);

  // Listen to product changes and update stats
  useDocumentListener("product", undefined, (update) => {
    const { transition, result } = update;

    switch (transition) {
      case "appear":
        setProducts((prev) => {
          const exists = prev.find((p) => p._id === result._id);
          return exists ? prev : [...prev, result];
        });
        break;

      case "update":
        setProducts((prev) =>
          prev.map((product) =>
            product._id === result._id ? { ...product, ...result } : product
          )
        );
        break;

      case "disappear":
        setProducts((prev) =>
          prev.filter((product) => product._id !== result._id)
        );
        break;
    }
  });

  // Recalculate stats when products change
  useEffect(() => {
    const newStats = products.reduce(
      (acc, product) => {
        acc.total += 1;

        if (product.isActive) {
          acc.active += 1;
        }

        if (product.inventory.currentStock <= 0) {
          acc.outOfStock += 1;
        } else if (
          product.inventory.currentStock <= product.inventory.minimumStock
        ) {
          acc.lowStock += 1;
        }

        acc.totalValue +=
          product.inventory.currentStock * product.pricing.sellingPrice;

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <motion.div
        key={stats.total}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {stats.active}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {stats.lowStock}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {stats.outOfStock}
              </p>
            </div>
            <Package className="w-8 h-8 text-red-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Value</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                ₹{(stats.totalValue / 1000).toFixed(0)}K
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
