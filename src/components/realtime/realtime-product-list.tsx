"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentListener, useUpdatedDocuments } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { Package, AlertTriangle, TrendingUp, Zap, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeProductListProps {
  initialProducts: Product[];
  onProductClick?: (product: Product) => void;
  maxItems?: number;
  showLowStockOnly?: boolean;
  className?: string;
}

const getStockStatus = (product: Product) => {
  const { currentStock, minimumStock, maximumStock } = product.inventory;
  const stockPercentage = (currentStock / maximumStock) * 100;

  if (currentStock <= 0) {
    return {
      status: "out-of-stock",
      color: "bg-red-500",
      textColor: "text-red-400",
      icon: AlertTriangle,
    };
  } else if (currentStock <= minimumStock) {
    return {
      status: "low-stock",
      color: "bg-yellow-500",
      textColor: "text-yellow-400",
      icon: AlertTriangle,
    };
  } else if (stockPercentage >= 80) {
    return {
      status: "high-stock",
      color: "bg-green-500",
      textColor: "text-green-400",
      icon: TrendingUp,
    };
  } else {
    return {
      status: "in-stock",
      color: "bg-blue-500",
      textColor: "text-blue-400",
      icon: Package,
    };
  }
};

export const RealtimeProductList: React.FC<RealtimeProductListProps> = ({
  initialProducts,
  onProductClick,
  maxItems,
  showLowStockOnly = false,
  className,
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const { addUpdatedId, isRecentlyUpdated } = useUpdatedDocuments(2000);
  const [isConnected, setIsConnected] = useState(false);

  // Filter products based on stock status if needed
  const filteredProducts = showLowStockOnly
    ? products.filter(
        (p) => p.inventory.currentStock <= p.inventory.minimumStock
      )
    : products;

  // Apply max items limit if specified
  const displayedProducts = maxItems
    ? filteredProducts.slice(0, maxItems)
    : filteredProducts;

  // Handle real-time updates
  useDocumentListener<Product>("product", undefined, {
    onAppear: (newProduct) => {
      setProducts((prev) => {
        // Check if product already exists to avoid duplicates
        const exists = prev.some((p) => p._id === newProduct._id);
        return exists ? prev : [newProduct, ...prev];
      });
      addUpdatedId(newProduct._id);
    },
    onUpdate: (update) => {
      if (update.result) {
        setProducts((prev) =>
          prev.map((p) => (p._id === update.result?._id ? update.result : p))
        );
        addUpdatedId(update.documentId);
      }
    },
    onDisappear: (deletedId) => {
      setProducts((prev) => prev.filter((p) => p._id !== deletedId));
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Products {showLowStockOnly ? "(Low Stock)" : ""}
        </h2>
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {displayedProducts.map((product) => {
          const status = getStockStatus(product);
          const isUpdated = isRecentlyUpdated(product._id);
          const stockPercentage = Math.min(
            (product.inventory.currentStock / product.inventory.maximumStock) * 100,
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
              transition={{
                duration: 0.2,
                layout: { duration: 0.3 },
                scale: isUpdated ? { duration: 0.5 } : { duration: 0 },
              }}
              className="relative"
            >
              {isUpdated && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute -top-2 -right-2 z-10"
                >
                  <Badge className="bg-green-500 animate-pulse">
                    Updated
                  </Badge>
                </motion.div>
              )}
              
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md overflow-hidden",
                  isUpdated ? "ring-2 ring-green-500" : ""
                )}
                onClick={() => onProductClick?.(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <status.icon
                          className={cn("h-5 w-5", status.textColor)}
                        />
                        <h3 className="font-medium text-lg">{product.name}</h3>
                        <Badge variant="outline" className="ml-2">
                          {product.brand?.name || "No Brand"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>Stock: {product.inventory.currentStock}</span>
                        <span className="mx-2">•</span>
                        <span>Min: {product.inventory.minimumStock}</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={cn("h-2.5 rounded-full", status.color)}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="font-bold text-lg">
                        ₹{product.pricing.sellingPrice.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground line-through">
                        ₹{product.pricing.purchasePrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {displayedProducts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2" />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
};
