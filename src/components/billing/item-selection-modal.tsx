"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";
import { useMemo, useState } from "react";

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  selectedSpecifications: any;
  onUpdateSpecification: (key: string, value: string) => void;
  filteredItems: any[];
  brands: any[];
  onAddItem: (product: any) => void;
  // For global search across active products
  activeProducts: any[];
}

export const ItemSelectionModal = ({
  isOpen,
  onClose,
  selectedCategory,
  selectedSpecifications,
  onUpdateSpecification,
  filteredItems,
  brands,
  onAddItem,
  activeProducts,
}: ItemSelectionModalProps) => {
  const { currency } = useLocaleStore();
  const [search, setSearch] = useState("");

  const allAvailableItems = useMemo(
    () =>
      activeProducts.filter(
        (p) => p.isActive && p.inventory?.currentStock > 0
      ),
    [activeProducts]
  );

  // Build subcategory list when a parent category is selected
  const subcategoryOptions = useMemo(() => {
    const parent = (selectedCategory || "").trim().toLowerCase();
    if (!parent) return [] as { value: string; label: string }[];
    const names = new Set<string>();
    for (const p of activeProducts) {
      const parentName = p.category?.parentCategory?.name
        ?.trim()
        .toLowerCase();
      const ownName = p.category?.name?.trim();
      if (parentName === parent && ownName) names.add(ownName);
    }
    return Array.from(names).map((n) => ({ value: n, label: n }));
  }, [activeProducts, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [] as any[];
    const q = search.toLowerCase();
    return allAvailableItems.filter((p) => {
      const specText = Object.values(p.specifications || {})
        .join(" ")
        .toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        specText.includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [search, allAvailableItems]);

  // Get unique values for filters
  const getUniqueValues = (key: string) => {
    const values = filteredItems
      .map((item) => item.specifications?.[key])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.map((value) => ({
      value: value.toString(),
      label: value.toString(),
    }));
  };

  const categoryBrands = brands.filter((brand) =>
    filteredItems.some((item) => item.brand?._id === brand._id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select ${selectedCategory} Items`}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any item (name, brand, specs, category)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 pl-9 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        {/* If searching, show results regardless of category */}
        {search.trim() && (
          <div className="max-h-96 overflow-y-auto space-y-2">
            <h4 className="font-medium text-white mb-3">
              Search Results ({searchResults.length})
            </h4>
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No items found</p>
              </div>
            ) : (
              searchResults.map((product) => (
                <motion.div
                  key={product._id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm">
                          {product.category?.name} - {product.brand?.name}
                        </p>
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
                          {product.inventory.currentStock} in stock
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 capitalize">
                        {Object.entries(product.specifications || {})
                          .filter(([, value]) => value !== undefined && value !== null && value !== "")
                          .map(([key, value]) => {
                            let formattedKey = key.replace(/([a-z])([A-Z])/g, "$1 $2");
                            formattedKey = formattedKey
                              .split(" ")
                              .filter((word) => word.toLowerCase() !== "is")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ");
                            if (String(value).toLowerCase() === "true") value = "Yes";
                            else if (String(value).toLowerCase() === "false") value = "No";
                            return `${formattedKey}: ${value}`;
                          })
                          .join(", ")}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-blue-400 font-medium">
                        {currency}
                        {product.pricing.sellingPrice}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          onAddItem(product);
                          onClose();
                        }}
                        className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs !py-1">
                        Add
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Specification Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subcategoryOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Subcategory</Label>
              <Dropdown
                options={[
                  { value: "", label: "All Subcategories" },
                  ...subcategoryOptions,
                ]}
                value={selectedSpecifications.subcategory || ""}
                onValueChange={(value) => onUpdateSpecification("subcategory", value)}
                placeholder="Select subcategory"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-gray-300">Brand</Label>
            <Dropdown
              options={[
                { value: "", label: "All Brands" },
                ...categoryBrands.map((brand) => ({
                  value: brand.name,
                  label: brand.name,
                })),
              ]}
              value={selectedSpecifications.brand || ""}
              onValueChange={(value) => onUpdateSpecification("brand", value)}
              placeholder="Select brand"
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {getUniqueValues("color").length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Color</Label>
              <Dropdown
                options={[
                  { value: "", label: "All Colors" },
                  ...getUniqueValues("color"),
                ]}
                value={selectedSpecifications.color || ""}
                onValueChange={(value) => onUpdateSpecification("color", value)}
                placeholder="Select color"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          )}

          {getUniqueValues("watts").length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Watts</Label>
              <Dropdown
                options={[
                  { value: "", label: "All Watts" },
                  ...getUniqueValues("watts"),
                ]}
                value={selectedSpecifications.watts || ""}
                onValueChange={(value) => onUpdateSpecification("watts", value)}
                placeholder="Select watts"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          )}

          {getUniqueValues("size").length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Size</Label>
              <Dropdown
                options={[
                  { value: "", label: "All Sizes" },
                  ...getUniqueValues("size"),
                ]}
                value={selectedSpecifications.size || ""}
                onValueChange={(value) => onUpdateSpecification("size", value)}
                placeholder="Select size"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          )}
        </div>

        {/* Available Items */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          <h4 className="font-medium text-white mb-3">
            Available Items ({filteredItems.length})
          </h4>

          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">No items match your filters</p>
            </div>
          ) : (
            filteredItems.map((product) => 
            { return (
              <motion.div
                key={product._id}
                className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white text-sm">
                        {`${product.name}`}
                      </p>
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
                        {product.inventory.currentStock} in stock
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 capitalize">
                      {Object.entries(product.specifications || {})
                        .filter(
                          ([_, value]) =>
                            value !== undefined &&
                            value !== null &&
                            value !== ""
                        )
                        .map(([key, value]) => {
                          // 1️⃣ Format camelCase / PascalCase into spaced words
                          let formattedKey = key.replace(
                            /([a-z])([A-Z])/g,
                            "$1 $2"
                          );

                          // 2️⃣ Split into words, remove "is", capitalize each
                          formattedKey = formattedKey
                            .split(" ")
                            .filter((word) => word.toLowerCase() !== "is")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ");

                          // 3️⃣ Convert boolean strings to Yes/No
                          if (String(value).toLowerCase() === "true")
                            value = "Yes";
                          else if (String(value).toLowerCase() === "false")
                            value = "No";

                          return `${formattedKey}: ${value}`;
                        })
                        .join(", ")}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-blue-400 font-medium">
                      {currency}
                      {product.pricing.sellingPrice}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        onAddItem(product);
                        onClose();
                      }}
                      className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs !py-1">
                      Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            )})
          )}
        </div>
      </div>
    </Modal>
  );
};
