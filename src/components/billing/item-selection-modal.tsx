"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";
import { useDataStore } from "@/store/data-store";
import { useEffect, useMemo, useState } from "react";

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
  const { syncWithSanity, isLoading } = useDataStore();
  const [search, setSearch] = useState("");

  // Clear search when modal opens or category changes to prevent stale filters
  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen, selectedCategory]);

  // If modal opens and selected category has zero items, attempt a background sync
  useEffect(() => {
    if (!isOpen) return;
    // Only care about the currently selected category result set
    const noneInCategory = (filteredItems?.length || 0) === 0 && (selectedCategory?.trim()?.length || 0) > 0;
    if (noneInCategory) {
      // Fire and forget; prevents hard-empty UI due to realtime lag
      syncWithSanity()?.catch(() => {});
    }
  }, [isOpen, filteredItems?.length, selectedCategory]);

  // Note: we rely on filteredItems + searchResults, so no separate allAvailableItems needed here

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

  // IMPORTANT: search only within the currently selected category (and applied filters)
  const searchResults = useMemo(() => {
    if (!search.trim()) return [] as any[];
    const q = search.toLowerCase();
    return filteredItems.filter((p) => {
      const specText = Object.values(p.specifications || {})
        .join(" ")
        .toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        specText.includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [search, filteredItems]);

  // Fallback: when category yields no items, try relaxed matches from all active products
  const fallbackMatches = useMemo(() => {
    const selected = (selectedCategory || "").trim().toLowerCase();
    if (!selected || (filteredItems?.length || 0) > 0) return [] as any[];

    return activeProducts.filter((p) => {
      const catName = p.category?.name?.trim().toLowerCase();
      const catSlug = p.category?.slug?.current?.trim().toLowerCase();
      const parentName = p.category?.parentCategory?.name?.trim().toLowerCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags : [];
      const specsText = Object.values(p.specifications || {})
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return (
        (catName && catName.includes(selected)) ||
        (catSlug && catSlug.includes(selected)) ||
        (parentName && parentName.includes(selected)) ||
        tags.some((t) => String(t).toLowerCase().includes(selected)) ||
        specsText.includes(selected)
      );
    });
  }, [selectedCategory, filteredItems?.length, activeProducts]);

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

        {/* Available Items (includes search filtering) */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {(() => {
            // If no filtered items, fall back to relaxed matches to avoid empty UI
            const baseItems = (filteredItems.length === 0 && fallbackMatches.length > 0)
              ? fallbackMatches
              : filteredItems;
            const displayedItems = search.trim() ? searchResults : baseItems;
            return (
              <>
                <h4 className="font-medium text-white mb-1">
                  Available Items ({displayedItems.length})
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  Category: {selectedCategory || "(none)"} • Filtered: {filteredItems.length} • Active: {activeProducts.length}
                </p>
                {filteredItems.length === 0 && fallbackMatches.length > 0 && (
                  <p className="text-xs text-amber-400 mb-2">
                    Showing best matches for "{selectedCategory}" (no exact category matches found)
                  </p>
                )}
                {displayedItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No items match your filters</p>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => syncWithSanity()}
                        className="text-xs">
                        {isLoading ? "Refreshing..." : "Refresh inventory"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  displayedItems.map((product) => (
                    <motion.div
                      key={product._id}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white text-sm">
                              {`${product.name}`}
                            </p>
                            {product.inventory.currentStock > 0 ? (
                              <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
                                {product.inventory.currentStock} in stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded">
                                Out of stock
                              </span>
                            )}
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
                            disabled={product.inventory.currentStock <= 0}
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
              </>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
};
