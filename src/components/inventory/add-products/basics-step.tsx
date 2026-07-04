"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";
import { Package, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";

const unitOptions = [
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "kg", label: "Kilogram" },
  { value: "liter", label: "Liter" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
];

interface BasicsStepProps {
  formData: InventoryFormData;
  errors: Record<string, string>;
  categories: { _id: string; name: string }[];
  brands: { _id: string; name: string }[];
  products: { _id: string; name: string; isActive: boolean }[];
  onInputChange: (field: string, value: string) => void;
  onExistingProductSelect: (productId: string) => void;
  onSpecificationChange: (field: string, value: string | number | boolean | string[]) => void;
}

export function BasicsStep({
  formData,
  errors,
  categories,
  brands,
  products,
  onInputChange,
  onExistingProductSelect,
  onSpecificationChange,
}: BasicsStepProps) {
  const isExistingProductSelected = !!formData.selectedExistingProduct;
  const [isNameFocused, setIsNameFocused] = useState(false);

  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  const filteredProducts = useMemo(() => {
    const query = normalize(formData.productName || "");
    if (!query) return [];
    return products.filter((p) => p.isActive && normalize(p.name).includes(query));
  }, [formData.productName, products]);

  const handleNameChange = (value: string) => {
    onInputChange("productName", value);
    const normalized = normalize(value);
    const exact = products.find((p) => normalize(p.name) === normalized && p.isActive);
    if (exact) {
      onExistingProductSelect(exact._id);
    } else {
      onInputChange("_selectedExistingProduct", "");
    }
  };

  const glassCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  };

  const glassInputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(16px)",
    borderRadius: "12px",
  };

  return (
    <div className="space-y-6">
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Basic Information</h3>
        </div>

        <div className="space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="text-sm text-slate-300">
              Product Name <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <div className="relative">
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={
                    isExistingProductSelected
                      ? "Pre-registered item selected"
                      : "Type product name..."
                  }
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setTimeout(() => setIsNameFocused(false), 200)}
                  disabled={isExistingProductSelected}
                  autoComplete="off"
                  style={glassInputStyle}
                />
                {isExistingProductSelected && (
                  <button
                    type="button"
                    onClick={() => {
                      onInputChange("productName", "");
                      onInputChange("selectedExistingProduct", "");
                      onExistingProductSelect("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.2)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    aria-label="Clear selected product"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.7)" }} />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {isNameFocused && !isExistingProductSelected && filteredProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl"
                    style={{
                      background: "rgba(15, 23, 42, 0.9)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                    }}
                  >
                    {filteredProducts.slice(0, 8).map((product) => (
                      <button
                        type="button"
                        key={product._id}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-200 transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onExistingProductSelect(product._id);
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span>{product.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {errors.productName && (
              <p className="text-xs text-red-400 mt-1">{errors.productName}</p>
            )}
            {isExistingProductSelected && (
              <p className="text-xs" style={{ color: "rgba(56,189,248,0.7)" }}>
                Existing product selected. You can update pricing and stock.
              </p>
            )}
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm text-slate-300">
                Category <span className="text-red-400">*</span>
              </Label>
              <Dropdown
                options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                value={formData.category}
                onValueChange={(value) => onInputChange("category", value)}
                placeholder="Select category"
                searchable
                disabled={isExistingProductSelected}
              />
              {errors.category && (
                <p className="text-xs text-red-400 mt-1">{errors.category}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm text-slate-300">
                Brand <span className="text-red-400">*</span>
              </Label>
              <Dropdown
                options={brands.map((brand) => ({ value: brand._id, label: brand.name }))}
                value={formData.brand}
                onValueChange={(value) => onInputChange("brand", value)}
                placeholder="Select brand"
                searchable
                disabled={isExistingProductSelected}
              />
              {errors.brand && (
                <p className="text-xs text-red-400 mt-1">{errors.brand}</p>
              )}
            </div>
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label htmlFor="unit" className="text-sm text-slate-300">
              Unit <span className="text-red-400">*</span>
            </Label>
            <Dropdown
              options={unitOptions}
              value={formData.unit}
              onValueChange={(value) => onInputChange("unit", value)}
              placeholder="Select unit"
              disabled={isExistingProductSelected}
            />
            {errors.unit && (
              <p className="text-xs text-red-400 mt-1">{errors.unit}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Specifications */}
      {formData.category && (
        <div style={glassCardStyle} className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Search className="w-4 h-4" style={{ color: "rgba(139,92,246,0.6)" }} />
            <h3 className="text-white font-semibold text-base">Specifications</h3>
          </div>
          <DynamicSpecificationFields
            categoryId={formData.category}
            formData={formData.specifications as Record<string, string>}
            onFieldChange={(field, value) => onSpecificationChange(field, value)}
            errors={errors}
            disabled={isExistingProductSelected}
          />
        </div>
      )}
    </div>
  );
}
