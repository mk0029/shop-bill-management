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

const glassItemStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  selectedSpecifications: any;
  onUpdateSpecification: (key: string, value: string) => void;
  filteredItems: any[];
  brands: any[];
  onAddItem: (product: any) => void;
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
  const { refreshActiveProducts, isLoading } = useDataStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen, selectedCategory]);

  const subcategoryOptions = useMemo(() => {
    const parent = (selectedCategory || "").trim().toLowerCase();
    if (!parent) return [] as { value: string; label: string }[];
    const names = new Set<string>();
    for (const p of activeProducts) {
      const parentName = p.category?.parentCategory?.name?.trim().toLowerCase();
      const ownName = p.category?.name?.trim();
      if (parentName === parent && ownName) names.add(ownName);
    }
    return Array.from(names).map((n) => ({ value: n, label: n }));
  }, [activeProducts, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [] as any[];
    const q = search.toLowerCase();
    return filteredItems.filter((p) => {
      const specText = Object.values(p.specifications || {}).join(" ").toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        specText.includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [search, filteredItems]);

  const fallbackMatches = useMemo(() => {
    const selected = (selectedCategory || "").trim().toLowerCase();
    if (!selected || (filteredItems?.length || 0) > 0) return [] as any[];
    return activeProducts.filter((p) => {
      const catName = p.category?.name?.trim().toLowerCase();
      const catSlug = p.category?.slug?.current?.trim().toLowerCase();
      const parentName = p.category?.parentCategory?.name?.trim().toLowerCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags : [];
      const specsText = Object.values(p.specifications || {}).map((v) => String(v).toLowerCase()).join(" ");
      return (
        (catName && catName.includes(selected)) ||
        (catSlug && catSlug.includes(selected)) ||
        (parentName && parentName.includes(selected)) ||
        tags.some((t) => String(t).toLowerCase().includes(selected)) ||
        specsText.includes(selected)
      );
    });
  }, [selectedCategory, filteredItems?.length, activeProducts]);

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
    <Modal isOpen={isOpen} onClose={onClose} title={`Select ${selectedCategory} Items`} size="lg">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(148,163,184,0.4)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any item (name, brand, specs, category)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400/80 pl-9 outline-none"
            style={glassInputStyle}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {subcategoryOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Subcategory</Label>
              <Dropdown
                options={[{ value: "", label: "All Subcategories" }, ...subcategoryOptions]}
                value={selectedSpecifications.subcategory || ""}
                onValueChange={(value) => onUpdateSpecification("subcategory", value)}
                placeholder="Select subcategory"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Brand</Label>
            <Dropdown
              disabled={categoryBrands.length <= 1}
              options={[{ value: "", label: "All Brands" }, ...categoryBrands.map((brand) => ({ value: brand.name, label: brand.name }))]}
              value={selectedSpecifications.brand || ""}
              onValueChange={(value) => onUpdateSpecification("brand", value)}
              placeholder="Select brand"
            />
          </div>

          {getUniqueValues("color").length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Color</Label>
              <Dropdown
                options={[{ value: "", label: "All Colors" }, ...getUniqueValues("color")]}
                value={selectedSpecifications.color || ""}
                onValueChange={(value) => onUpdateSpecification("color", value)}
                placeholder="Select color"
              />
            </div>
          )}

          {getUniqueValues("watts").length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Watts</Label>
              <Dropdown
                options={[{ value: "", label: "All Watts" }, ...getUniqueValues("watts")]}
                value={selectedSpecifications.watts || ""}
                onValueChange={(value) => onUpdateSpecification("watts", value)}
                placeholder="Select watts"
              />
            </div>
          )}

          {getUniqueValues("size").length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Size</Label>
              <Dropdown
                options={[{ value: "", label: "All Sizes" }, ...getUniqueValues("size")]}
                value={selectedSpecifications.size || ""}
                onValueChange={(value) => onUpdateSpecification("size", value)}
                placeholder="Select size"
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {(() => {
            const baseItems = (filteredItems.length === 0 && fallbackMatches.length > 0) ? fallbackMatches : filteredItems;
            const displayedItems = search.trim() ? searchResults : baseItems;
            return (
              <>
                <h4 className="font-medium text-white text-sm mb-2">
                  Available Items ({displayedItems.length})
                </h4>
                {filteredItems.length === 0 && fallbackMatches.length > 0 && (
                  <p className="text-xs mb-2" style={{ color: "rgba(251,191,36,0.7)" }}>
                    Showing best matches for &quot;{selectedCategory}&quot; (no exact category matches found)
                  </p>
                )}
                {displayedItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-2" style={{ color: "rgba(148,163,184,0.2)" }} />
                    <p className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>No items match your filters</p>
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => refreshActiveProducts()}
                        className="text-xs"
                      >
                        {isLoading ? "Refreshing..." : "Refresh inventory"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  displayedItems.map((product) => (
                    <motion.div
                      key={product._id}
                      style={glassItemStyle}
                      className="p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white text-sm truncate">{product.name}</p>
                            {product.inventory.currentStock > 0 ? (
                              <span
                                className="px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap"
                                style={{
                                  background: "rgba(52,211,153,0.1)",
                                  border: "1px solid rgba(52,211,153,0.15)",
                                  color: "rgba(52,211,153,0.7)",
                                }}
                              >
                                {product.inventory.currentStock} in stock
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap"
                                style={{
                                  background: "rgba(248,113,113,0.1)",
                                  border: "1px solid rgba(248,113,113,0.15)",
                                  color: "rgba(248,113,113,0.7)",
                                }}
                              >
                                Out of stock
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                            {Object.entries(product.specifications || {})
                              .filter(([_, value]) => value !== undefined && value !== null && value !== "")
                              .map(([key, value]) => {
                                let formattedKey = key.replace(/([a-z])([A-Z])/g, "$1 $2");
                                formattedKey = formattedKey.split(" ").filter((word) => word.toLowerCase() !== "is").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
                                if (String(value).toLowerCase() === "true") value = "Yes";
                                else if (String(value).toLowerCase() === "false") value = "No";
                                return `${formattedKey}: ${value}`;
                              })
                              .join(", ")}
                          </p>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-sm font-medium" style={{ color: "rgba(56,189,248,0.7)" }}>
                            {currency}{product.pricing.sellingPrice}
                          </p>
                          <Button
                            size="sm"
                            disabled={product.inventory.currentStock <= 0}
                            onClick={() => { onAddItem(product); onClose(); }}
                            className="mt-1 text-xs"
                            style={{
                              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
                              border: "1px solid rgba(56,189,248,0.25)",
                            }}
                          >
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
