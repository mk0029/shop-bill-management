import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  selectedSpecifications: any;
  onUpdateSpecification: (key: string, value: string) => void;
  filteredItems: any[];
  brands: any[];
  onAddItem: (product: any) => void;
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
}: ItemSelectionModalProps) => {
  const { currency } = useLocaleStore();

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
        {/* Specification Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            filteredItems.map((product) => (
              <motion.div
                key={product._id}
                whileHover={{ scale: 1.01 }}
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
                    <p className="text-xs text-gray-400">
                      {Object.entries(product.specifications || {})
                        .filter(([_, value]) => value)
                        .map(([key, value]) => `${key}: ${value}`)
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
                      className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                      Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
