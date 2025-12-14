/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Package, X } from "lucide-react";
import { DynamicForm } from "@/components/dynamic-fields/dynamic-form";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BasicInfoSectionProps {
  formData: any;
  categories: any[];
  brands: any[];
  products: any[];
  dynamicSpecificationFields: any;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
  onExistingProductSelect: (productId: string) => void;
  onSpecificationChange?: (field: string, value: any) => void;
}

const unitOptions = [
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "kg", label: "Kilogram" },
  { value: "liter", label: "Liter" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
];

export const BasicInfoSection = ({
  formData,
  categories,
  brands,
  products,
  errors,
  dynamicSpecificationFields,
  onInputChange,
  onExistingProductSelect,
  onSpecificationChange,
}: BasicInfoSectionProps) => {
  const isExistingProductSelected = !!formData.selectedExistingProduct;
  const { isReady } = useDynamicFieldRegistry();
  const  [isCustomNameFocused, setIsCustomNameFocused] = useState(false);
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Selection/Input Combined Section */}
        <div className="space-y-2">
          <Label htmlFor="productName" className="text-gray-300">
            Product Name *
          </Label>
          <div className="w-full relative">
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => onInputChange("productName", e.target.value)}
              className="bg-[#1e2530] border-gray-700 text-gray-300"
              placeholder="Type new product name"
              onFocus={() => setIsCustomNameFocused(true)}
              onBlur={() => setIsCustomNameFocused(false)}
              disabled={isExistingProductSelected}
              autoComplete="off"
            />

            {isExistingProductSelected && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                onClick={() => {
                  onInputChange("selectedExistingProduct", "");
                  onInputChange("productName", "");
                }}
                aria-label="Clear selected product"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <AnimatePresence initial={false}>
              {isCustomNameFocused &&
                !isExistingProductSelected &&
                (formData.productName || "").trim().length > 0 &&
                products.length > 0 && (
                <motion.div
                  className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-gray-700 bg-[#1e2530] shadow-lg"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                >
                  {products
                    .filter((p) => p.isActive)
                    .map((product) => (
                      <button
                        type="button"
                        key={product._id}
                        className="w-full text-left px-3 py-2 hover:bg-[#2a3441] text-gray-200"
                        onMouseDown={() => onExistingProductSelect(product._id)}
                      >
                        {product.name}
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {errors.productName && (
            <p className="text-red-400 text-sm">{errors.productName}</p>
          )}
          {isExistingProductSelected && (
            <p className="text-blue-400 text-sm">
              Product details loaded. Purchase price, selling price, and stock
              quantity can be edited.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-gray-300">
              Category *
            </Label>
            <Dropdown
              options={categories.map((cat) => ({
                value: cat._id,
                label: cat.name,
              }))}
              value={formData.category}
              onValueChange={(value) => onInputChange("category", value)}
              placeholder="Select category"
              className="bg-gray-800 border-gray-700"
              disabled={isExistingProductSelected}
            />
            {errors.category && (
              <p className="text-red-400 text-sm">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand" className="text-gray-300">
              Brand *
            </Label>
            <Dropdown
              options={brands.map((brand) => ({
                value: brand._id,
                label: brand.name,
              }))}
              value={formData.brand}
              onValueChange={(value) => onInputChange("brand", value)}
              placeholder="Select brand"
              className="bg-gray-800 border-gray-700"
              disabled={isExistingProductSelected}
            />
            {errors.brand && (
              <p className="text-red-400 text-sm">{errors.brand}</p>
            )}
          </div>
        </div>

        {/* Dynamic Specification Fields */}
        {formData.category && dynamicSpecificationFields!==false&& (
     
            dynamicSpecificationFields
        
        )}
      </CardContent>
    </Card>
  );
};
