import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { InventoryValue } from "@/types";

interface TopValueProductsProps {
  inventoryValue: InventoryValue | null;
  maxDisplay?: number;
}

export function TopValueProducts({
  inventoryValue,
  maxDisplay = 10,
}: TopValueProductsProps) {
  if (!inventoryValue || inventoryValue.breakdown.length === 0) {
    return null;
  }

  const topProducts = inventoryValue.breakdown.slice(0, maxDisplay);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Top Value Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg gap-3"
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className=" text-xs sm:text-sm font-medium text-blue-400">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {product.brand} • {product.stock} {product.unit}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-green-400">
                  ₹{product.totalValue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  ₹{product.unitPrice}/{product.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TopValueProducts;
