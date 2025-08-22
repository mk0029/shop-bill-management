"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Package,
  Zap,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  itemCategories,
  lightTypes,
  colors,
  sizes,
  wireGauges,
  ampereRatings,
  units,
  currency,
  getCategoryLabel,
  getLightTypeLabel,
  getUnitLabel,
  getItemSpecifications,
} from "@/lib/inventory-data";
import { useProducts } from "@/hooks/use-sanity-data";

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [itemNotFound, setItemNotFound] = useState(false);
  const { getProductById, updateProduct, isLoading: productsLoading } = useProducts();

  const [formData, setFormData] = useState({
    category: "",
    lightType: "",
    color: "",
    size: "",
    watts: "",
    wireGauge: "",
    ampere: "",
    brand: "",
    purchasePrice: "",
    sellingPrice: "",
    currentStock: "",
    unit: "",
    description: "",
  });

  // Load item data from centralized store on mount
  useEffect(() => {
    if (!itemId) return;
    setIsLoading(true);
    try {
      const item: any = getProductById(String(itemId));
      if (!item) {
        // If products are still loading, wait for next render
        if (productsLoading) return;
        setItemNotFound(true);
        return;
      }
      setFormData({
        category: item.category?._id || "",
        lightType: item.specifications?.lightType || "",
        color: item.specifications?.color || "",
        size: item.specifications?.size || "",
        watts: item.specifications?.watts?.toString() || "",
        wireGauge: item.specifications?.wireGauge || "",
        ampere: item.specifications?.ampere || "",
        brand: item.brand?._id || "",
        purchasePrice: item.pricing?.purchasePrice?.toString() || "",
        sellingPrice: item.pricing?.sellingPrice?.toString() || "",
        currentStock: item.inventory?.currentStock?.toString() || "",
        unit: item.pricing?.unit || "",
        description: item.description || "",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, productsLoading]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Build partial updates for known fields
      const updates: any = {
        pricing: {
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          unit: formData.unit || "piece",
        },
        inventory: {
          currentStock: parseInt(formData.currentStock || "0", 10) || 0,
        },
        description: formData.description,
        specifications: {
          ...(formData.lightType && { lightType: formData.lightType }),
          ...(formData.color && { color: formData.color }),
          ...(formData.size && { size: formData.size }),
          ...(formData.watts && { watts: Number(formData.watts) }),
          ...(formData.wireGauge && { wireGauge: formData.wireGauge }),
          ...(formData.ampere && { ampere: formData.ampere }),
        },
      };

      // Optionally update brand/category when selected
      if (formData.brand) {
        updates.brand = { _type: "reference", _ref: formData.brand };
      }
      if (formData.category) {
        updates.category = { _type: "reference", _ref: formData.category };
      }

      await updateProduct(String(itemId), updates);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/admin/inventory");
  };

  const getItemSpecifications = () => {
    const specs = [];
    if (formData.lightType)
      specs.push(`Type: ${getLightTypeLabel(formData.lightType)}`);
    if (formData.color) specs.push(`Color: ${formData.color}`);
    if (formData.size) specs.push(`Size: ${formData.size}`);
    if (formData.watts) specs.push(`${formData.watts}W`);
    if (formData.wireGauge) specs.push(`Gauge: ${formData.wireGauge} sq mm`);
    if (formData.ampere) specs.push(`${formData.ampere}A`);
    return specs.join(", ");
  };

  // Conditional field visibility
  const isLightItem = formData.category === "light";
  const needsColor = isLightItem;
  const needsSize =
    isLightItem &&
    ["panel", "concealed", "tubelight"].includes(formData.lightType);
  const needsWatts = ["light", "motor", "pump"].includes(formData.category);
  const needsWireGauge = formData.category === "wire";
  const needsAmpere = ["switch", "socket", "mcb"].includes(formData.category);

  // Filter brands based on selected category
  const availableBrands = formData.category ? [] : [];

  if (itemNotFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white mb-2">
              Item Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              The item you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Button onClick={() => router.push("/admin/inventory")}>
              Go to Inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Edit Inventory Item
          </h1>
          <p className="text-gray-400 mt-1">
            Update item details and specifications
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Edit Item Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-gray-300">
                Category *
              </Label>
              <Dropdown
                options={itemCategories}
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
                placeholder="Select category"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Light Type (only for lights) */}
            {isLightItem && (
              <div className="space-y-2">
                <Label htmlFor="lightType" className="text-gray-300">
                  Light Type *
                </Label>
                <Dropdown
                  options={lightTypes}
                  value={formData.lightType}
                  onValueChange={(value) =>
                    handleInputChange("lightType", value)
                  }
                  placeholder="Select light type"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}

            {/* Color (for lights) */}
            {needsColor && (
              <div className="space-y-2">
                <Label htmlFor="color" className="text-gray-300">
                  Color *
                </Label>
                <Dropdown
                  options={colors}
                  value={formData.color}
                  onValueChange={(value) => handleInputChange("color", value)}
                  placeholder="Select color"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}

            {/* Size (for specific light types) */}
            {needsSize && (
              <div className="space-y-2">
                <Label htmlFor="size" className="text-gray-300">
                  Size *
                </Label>
                <Dropdown
                  options={sizes}
                  value={formData.size}
                  onValueChange={(value) => handleInputChange("size", value)}
                  placeholder="Select size"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}

            {/* Watts (for lights, motors, pumps) */}
            {needsWatts && (
              <div className="space-y-2">
                <Label htmlFor="watts" className="text-gray-300">
                  Watts (0.5W to 2000W) *
                </Label>
                <Input
                  id="watts"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2000"
                  value={formData.watts}
                  onChange={(e) => handleInputChange("watts", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter watts (e.g., 5, 12, 20, 100, 500, 1000)"
                  required
                />
              </div>
            )}

            {/* Wire Gauge (for wires) */}
            {needsWireGauge && (
              <div className="space-y-2">
                <Label htmlFor="wireGauge" className="text-gray-300">
                  Wire Gauge *
                </Label>
                <Dropdown
                  options={wireGauges}
                  value={formData.wireGauge}
                  onValueChange={(value) =>
                    handleInputChange("wireGauge", value)
                  }
                  placeholder="Select wire gauge"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}

            {/* Ampere (for switches, sockets, MCB) */}
            {needsAmpere && (
              <div className="space-y-2">
                <Label htmlFor="ampere" className="text-gray-300">
                  Ampere *
                </Label>
                <Dropdown
                  options={ampereRatings}
                  value={formData.ampere}
                  onValueChange={(value) => handleInputChange("ampere", value)}
                  placeholder="Select ampere"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}

            {/* Brand and Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-gray-300">
                  Brand *
                </Label>
                <Dropdown
                  options={availableBrands}
                  value={formData.brand}
                  onValueChange={(value) => handleInputChange("brand", value)}
                  placeholder={
                    formData.category ? "Select brand" : "Select category first"
                  }
                  className="bg-gray-800 border-gray-700"
                  disabled={!formData.category}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-gray-300">
                  Purchase Price *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-50" />
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      handleInputChange("purchasePrice", e.target.value)
                    }
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter purchase price"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-gray-300">
                  Selling Price *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-50" />
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      handleInputChange("sellingPrice", e.target.value)
                    }
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter selling price"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currentStock" className="text-gray-300">
                  Purchased Items *
                </Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) =>
                    handleInputChange("currentStock", e.target.value)
                  }
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter purchased quantity"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="text-gray-300">
                  Unit *
                </Label>
                <Dropdown
                  options={units}
                  value={formData.unit}
                  onValueChange={(value) => handleInputChange("unit", value)}
                  placeholder="Select unit"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none"
                placeholder="Add any additional description..."
              />
            </div>

            {/* Item Preview */}
            {formData.category && formData.brand && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="font-medium text-white mb-3">Item Preview</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-400">Category:</span>{" "}
                    <span className="text-white">
                      {getCategoryLabel(formData.category)}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Category:</span>{" "}
                    <span className="text-white capitalize">
                      {formData.category}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Brand:</span>{" "}
                    <span className="text-white">{formData.brand}</span>
                  </p>
                  {getItemSpecifications() && (
                    <p>
                      <span className="text-gray-400">Specifications:</span>{" "}
                      <span className="text-white">
                        {getItemSpecifications()}
                      </span>
                    </p>
                  )}
                  <p>
                    <span className="text-gray-400">Pricing:</span>{" "}
                    <span className="text-white">
                      {currency}
                      {formData.purchasePrice} → {currency}
                      {formData.sellingPrice}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Stock:</span>{" "}
                    <span className="text-white">
                      {formData.currentStock} {formData.unit}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Updating Item..." : "Update Item"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        size="md"
        title="Item Updated Successfully!"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className=" h-6 w-6 sm:w-8 sm:h-8  text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Item Updated Successfully
            </h3>
            <p className="text-gray-400">
              The item has been successfully updated in your inventory.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">
              Updated Item Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white">
                  {getCategoryLabel(formData.category)} - {formData.brand}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="text-white capitalize">
                  {formData.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Brand:</span>
                <span className="text-white">{formData.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stock:</span>
                <span className="text-white">
                  {formData.currentStock} {formData.unit}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSuccessClose} className="flex-1">
              View All Items
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/inventory")}
            >
              Go to Inventory
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
