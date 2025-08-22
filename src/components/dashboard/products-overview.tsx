"use client";

import { useProducts, useBrands, useCategories } from "@/hooks/use-sanity-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, AlertTriangle } from "lucide-react";
import {
  getProductBrandName,
  getProductCategoryName,
} from "@/lib/inventory-data";
import Link from "next/link";

export function ProductsOverview() {
  const { products, activeProducts, isLoading } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lowStockProducts = products.filter(
    (product) =>
      product.inventory.currentStock <= product.inventory.minimumStock
  );

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Products
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {products.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Active Products
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {activeProducts.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Brands</p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {brands.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Categories</p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {categories.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert ({lowStockProducts.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between gap-3 sm:gap-4 p-3 bg-gray-800 rounded min-h-12">
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-sm text-gray-400">
                      {getProductBrandName(product)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-500">
                      Stock: {product.inventory.currentStock}
                    </p>
                    <p className="text-xs text-gray-400">
                      Min: {product.inventory.minimumStock}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <p className="text-sm text-gray-400 text-center">
                  +{lowStockProducts.length - 5} more items need restocking
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between max-sm:pb-1">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Products
          </CardTitle>
          <Link href="/admin/inventory/add">
            <Button size="sm" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 ring-offset-gray-900">
              <Plus className="h-4 w-4" />
           <span className="max-sm:hidden">   Add Product</span>
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.slice(0, 5).map((product) => (
              <div
                key={product._id}
                className="flex flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-white">{product.name}</h3>
                      <p className="text-sm text-gray-400">
                        {getProductBrandName(product)} •{" "}
                        {getProductCategoryName(product)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 w-auto sm:justify-end">
                  <div className="text-right">
                    <p className="font-medium text-white">
                      ₹{product.pricing.sellingPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Stock: {product.inventory.currentStock}
                    </p>
                  </div>
                  <Badge className="max-sm:hidden" variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
