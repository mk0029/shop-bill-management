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
  // Show ALL categories (parents + subcategories)
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
    <div className="max-h-[200px] overflow-auto">    <div className=" flex flex-wrap gap-3 mb-6">
          {filteredCategories.map((category) => {
            return (
              <motion.div
                key={category._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity:0.1,filter: 'blur(1px)' }} // starting state
                whileInView={{opacity:1,filter: 'blur(0px)' }} // when it enters viewport
                transition={{ duration: 0.3, ease: "linear" }} 
                viewport={{ once: false, amount: 0.5 }}  // 👈 viewport settings
              
  
                >
                <div
                  // variant="outline"
                  onClick={() => onOpenItemModal(category.name.toLowerCase())}
                  className={`w-full h-auto px-3 py-2 flex flex-col items-start gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700 rounded-md cursor-pointer`}
                  aria-disabled>
                    <p className="font-medium text-white text-base">{category.name}</p>
                </div>
              </motion.div>
            );
          })}
            {categoryFilter==='all'? '':  <motion.div 
              initial={{ scale: 0.6 }} // starting state
              whileInView={{ scale: 1 }} // when it enters viewport
              transition={{ duration: 0.4, ease: "easeInOut" }} 
              viewport={{ once: false, amount: 0.5 }}  // 👈 viewport settings

                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}>
                <div
                  // variant="outline"
                  onClick={() => setCategoryFilter('all')}
                  className={`w-full h-auto cursor-pointer pt-2`}
                  aria-disabled>
                    <p className="font-noraml text-white text-base">Reset Items</p>
                </div>
              </motion.div>}

          {/* Loading state */}
          {productsLoading && (
            <div className="col-span-full text-center py-8">
              <div className="h-6 w-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading categories...</p>
            </div>
          )}
        </div></div>
      </CardContent>
    </Card>
  );
};
