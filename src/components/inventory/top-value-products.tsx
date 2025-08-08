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
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-400">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.brand} • {product.stock} {product.unit}
                  </p>
                </div>
              </div>
              <div className="text-right">
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
