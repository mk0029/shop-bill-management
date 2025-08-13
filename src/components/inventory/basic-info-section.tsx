import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Package } from "lucide-react";
import { DynamicForm } from "@/components/dynamic-fields/dynamic-form";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";

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
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="existingProduct" className="text-gray-300">
            Select Existing Product (Optional)
          </Label>
          <Dropdown
            options={[
              { value: "", label: "Create New Product" },
              ...products
                .filter((product) => product.isActive && !product.deleted)
                .map((product) => ({
                  value: product._id,
                  label: `${product.name} - ${product.brand.name}`,
                })),
            ]}
            value={formData.selectedExistingProduct}
            onValueChange={onExistingProductSelect}
            placeholder="Select existing product or create new"
            className="bg-gray-800 border-gray-700"
          />
          {isExistingProductSelected && (
            <p className="text-blue-400 text-sm">
              Product details loaded. Purchase price, selling price, and stock
              quantity can be edited.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {dynamicSpecificationFields && dynamicSpecificationFields}
          <div className="space-y-2">
            <Label htmlFor="unit" className="text-gray-300">
              Unit *
            </Label>
            <Dropdown
              options={unitOptions}
              value={formData.unit}
              onValueChange={(value) => onInputChange("unit", value)}
              placeholder="Select unit"
              className="bg-gray-800 border-gray-700"
              disabled={isExistingProductSelected}
            />
            {errors.unit && (
              <p className="text-red-400 text-sm">{errors.unit}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentStock" className="text-gray-300">
              Current Stock *
            </Label>
            <Input
              id="currentStock"
              type="number"
              min="0"
              value={formData.currentStock}
              onChange={(e) => onInputChange("currentStock", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter stock quantity"
            />
            {errors.currentStock && (
              <p className="text-red-400 text-sm">{errors.currentStock}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300">
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => onInputChange("description", e.target.value)}
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter product description..."
            disabled={isExistingProductSelected}
          />
        </div>

        {/* Dynamic Specification Fields */}
        {formData.category && isReady && (
          <div className="md:col-span-2">
            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-medium text-white mb-4">
                Specifications
              </h3>
              <DynamicForm
                key={`${formData.category}-${formData.selectedExistingProduct || "new"}`}
                categoryId={formData.category}
                initialValues={formData.specifications || {}}
                onFieldChange={(fieldKey, value, allValues) => {
                  if (onSpecificationChange) {
                    onSpecificationChange(fieldKey, value);
                  }
                }}
                disabled={isExistingProductSelected}
                showSubmitButton={false}
                showResetButton={false}
                layout="grid"
                columns={2}
                className="bg-transparent"
                renderAsForm={false}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
