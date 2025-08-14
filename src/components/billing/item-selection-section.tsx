/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useState } from "react";

interface ItemSelectionSectionProps {
  categories: any[];
  activeProducts: any[];
  productsLoading: boolean;
  onOpenItemModal: (category: string) => void;
}

export const ItemSelectionSection = ({
  categories,
  activeProducts,
  productsLoading,
  onOpenItemModal,
}: ItemSelectionSectionProps) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredCategories = categories.filter((category) => {
    if (categoryFilter === "all") return true;
    return category.name.toLowerCase() === categoryFilter;
  });

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bill Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Category Filter */}
        <div className="mb-4">
          <Label className="text-gray-300 mb-2 block">Filter by Category</Label>
          <Dropdown
            options={[
              { value: "all", label: "All Categories" },
              ...categories.map((cat) => ({
                value: cat.name.toLowerCase(),
                label: cat.name,
              })),
            ]}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="Select category to filter"
            className="bg-gray-800 border-gray-700"
          />
        </div>

        {/* Category Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {filteredCategories.map((category) => {
            const categoryProducts = activeProducts.filter(
              (product) =>
                product.category?.name?.toLowerCase() ===
                  category.name.toLowerCase() &&
                product.inventory.currentStock > 0 &&
                product.isActive
            );

            return (
              <motion.div
                key={category._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}>
                <div
                  // variant="outline"
                  onClick={() => {
                    if (categoryProducts.length > 0) {
                      onOpenItemModal(category.name.toLowerCase());
                    }
                  }}
                  className={`w-full h-auto p-3 flex flex-col items-start gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700 rounded-md ${categoryProducts.length > 0 ? " cursor-pointer" : "cursor-not-allowed"}`}
                  // disabled={categoryProducts.length === 0}>
                  aria-disabled>
                  {" "}
                  <div className="text-left">
                    <p className="font-medium text-white">{category.name}</p>
                    <p className="text-sm text-gray-400">
                      {category.description || `${category.name} products`}
                    </p>
                    <p className="text-sm text-blue-400">
                      {categoryProducts.length} items available
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Loading state */}
          {productsLoading && (
            <div className="col-span-full text-center py-8">
              <div className="h-6 w-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading categories...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
