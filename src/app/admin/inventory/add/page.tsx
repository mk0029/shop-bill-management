"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import {
  SuccessPopup,
  createProductSuccessPopup,
  type SuccessPopupData,
} from "@/components/ui/success-popup";
import {
  ConfirmationPopup,
  type ConfirmationData,
} from "@/components/ui/confirmation-popup";
import { createProduct } from "@/lib/form-service";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Package,
  Zap,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore } from "@/store/inventory-store";
import { currency } from "@/lib/inventory-data";

// Using data from helper file instead of local arrays

export default function AddInventoryItemPage() {
  const router = useRouter();
  const { brands, fetchBrands } = useBrandStore();
  const { categories, fetchCategories, getActiveCategories } =
    useCategoryStore();
  const { getOptionsByCategory, getOptionLabel } = useSpecificationsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<SuccessPopupData | null>(null);
  const [confirmationData, setConfirmationData] =
    useState<ConfirmationData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [itemsList, setItemsList] = useState<unknown[]>([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, [fetchBrands, fetchCategories]);

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

  // Get dropdown options from stores
  const itemCategories = getActiveCategories().map((cat) => ({
    value: cat._id, // Use category ID as per API documentation
    label: cat.name,
  }));

  // Helper functions
  const getCategoryLabel = (categoryId: string) => {
    const found = itemCategories.find((cat) => cat.value === categoryId);
    return found ? found.label : categoryId;
  };

  const getCategoryName = (categoryId: string) => {
    const found = itemCategories.find((cat) => cat.value === categoryId);
    return found ? found.label.toLowerCase() : categoryId;
  };

  const lightTypes = getOptionsByCategory("light", "lightType");
  const colors = getOptionsByCategory(
    getCategoryName(formData.category) || "light",
    "color"
  );
  const sizes = getOptionsByCategory(
    getCategoryName(formData.category) || "light",
    "size"
  );
  const wireGauges = getOptionsByCategory("wire", "wireGauge");
  const ampereRatings = getOptionsByCategory(
    getCategoryName(formData.category) || "switch",
    "amperage"
  );
  const units = useSpecificationsStore.getState().unitOptions;

  const getLightTypeLabel = (lightType: string) => {
    return getOptionLabel(lightType, "lightType");
  };

  const getUnitLabel = (unit: string) => {
    return getOptionLabel(unit, "unit");
  };

  const getItemSpecifications = () => {
    const specs = [];

    if (formData.lightType) specs.push(`Type: ${formData.lightType}`);
    if (formData.color) specs.push(`Color: ${formData.color}`);
    if (formData.size) specs.push(`Size: ${formData.size}`);
    if (formData.watts) specs.push(`Watts: ${formData.watts}W`);
    if (formData.wireGauge) specs.push(`Gauge: ${formData.wireGauge}`);
    if (formData.ampere) specs.push(`Ampere: ${formData.ampere}`);

    return specs.join(", ");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Check if item is a light
  const isLightItem = getCategoryName(formData.category) === "light";

  // Check if light item needs color field
  const needsColor = isLightItem && formData.lightType;

  // Check if light item needs size field
  const needsSize =
    isLightItem &&
    ["panel", "concealed", "tubelight"].includes(formData.lightType);

  // Check if item needs watts field
  const needsWatts = ["light", "motor", "pump"].includes(
    getCategoryName(formData.category)
  );

  // Check if item needs wire gauge
  const needsWireGauge = getCategoryName(formData.category) === "wire";

  // Check if item needs ampere
  const needsAmpere = ["switch", "socket", "mcb"].includes(
    getCategoryName(formData.category)
  );

  // Filter active brands based on selected category (all brands are available for all categories)
  const availableBrands = brands
    .filter((brand) => brand.isActive)
    .map((brand) => ({
      value: brand._id,
      label: brand.name,
    }));

  const clearForm = () => {
    setFormData({
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
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.category) {
      errors.category = "Please select a category";
    }
    if (!formData.brand) {
      errors.brand = "Please select a brand";
    }
    if (!formData.unit) {
      errors.unit = "Please select a unit";
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      errors.purchasePrice = "Please enter a valid purchase price";
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      errors.sellingPrice = "Please enter a valid selling price";
    }
    if (
      formData.purchasePrice &&
      formData.sellingPrice &&
      parseFloat(formData.sellingPrice) < parseFloat(formData.purchasePrice)
    ) {
      errors.sellingPrice =
        "Selling price should be greater than or equal to purchase price";
    }
    if (!formData.currentStock || parseInt(formData.currentStock) < 0) {
      errors.currentStock = "Please enter a valid current stock";
    }

    // Category-specific validations
    if (isLightItem && !formData.lightType) {
      errors.lightType = "Please select a light type";
    }
    if (needsColor && !formData.color) {
      errors.color = "Please select a color";
    }
    if (needsSize && !formData.size) {
      errors.size = "Please select a size";
    }
    if (needsWatts && (!formData.watts || parseFloat(formData.watts) <= 0)) {
      errors.watts = "Please enter valid watts";
    }
    if (needsWireGauge && !formData.wireGauge) {
      errors.wireGauge = "Please select wire gauge";
    }
    if (needsAmpere && !formData.ampere) {
      errors.ampere = "Please select ampere rating";
    }

    setFormErrors(errors);

    // Show first error as popup if there are errors
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setConfirmationData({
        title: "Validation Error",
        message: firstError,
        type: "error",
      });
      return false;
    }

    return true;
  };

  const addItemToList = () => {
    // Validate form before adding to list
    if (!validateForm()) {
      return;
    }

    // Get brand name for display
    const selectedBrand = brands.find((brand) => brand._id === formData.brand);
    const brandName = selectedBrand ? selectedBrand.name : "Unknown Brand";

    // Build product name with specifications
    let productName = `${getCategoryLabel(formData.category)} - ${brandName}`;
    const specs = [];
    if (formData.lightType) specs.push(formData.lightType);
    if (formData.color) specs.push(formData.color);
    if (formData.size) specs.push(formData.size);
    if (formData.watts) specs.push(`${formData.watts}W`);
    if (formData.wireGauge) specs.push(formData.wireGauge);
    if (formData.ampere) specs.push(`${formData.ampere}A`);

    if (specs.length > 0) {
      productName += ` (${specs.join(", ")})`;
    }

    // Create item object
    const newItem = {
      id: Date.now(), // Temporary ID for list management
      ...formData,
      productName,
      brandName,
      specifications: specs.join(", "),
    };

    // If there are already items in the list, automatically add without popup
    if (itemsList.length > 0) {
      setItemsList((prev) => [...prev, newItem]);
      clearForm();
      setConfirmationData({
        title: "Item Added to List",
        message: `"${productName}" has been added to your list. You now have ${
          itemsList.length + 1
        } items ready to submit.`,
        type: "success",
      });
      return;
    }

    // If this is the first item (no items in list), show options popup
    setConfirmationData({
      title: "Item Ready to Add",
      message: `"${productName}" is ready to be added. What would you like to do?`,
      type: "success",
      actions: [
        {
          label: "Add to List & Continue",
          action: () => {
            setItemsList([newItem]);
            clearForm();
            setConfirmationData(null);
          },
          variant: "default",
        },
        {
          label: "Save This Item Only",
          action: () => {
            handleSingleItemSubmit(newItem);
            setConfirmationData(null);
          },
          variant: "outline",
        },
      ],
    });
  };

  const handleSingleItemSubmit = async (item: unknown) => {
    setIsLoading(true);

    try {
      const productData = {
        name: item.productName,
        description: item.description,
        brandId: item.brand,
        categoryId: item.category,
        specifications: {
          lightType: item.lightType || undefined,
          color: item.color || undefined,
          size: item.size || undefined,
          watts: item.watts ? parseFloat(item.watts) : undefined,
          wireGauge: item.wireGauge || undefined,
          amperage: item.ampere || undefined, // Note: changed from 'ampere' to 'amperage' to match store
        },
        pricing: {
          purchasePrice: parseFloat(item.purchasePrice),
          sellingPrice: parseFloat(item.sellingPrice),
          unit: item.unit,
        },
        inventory: {
          currentStock: parseInt(item.currentStock),
          minimumStock: Math.max(
            1,
            Math.floor(parseInt(item.currentStock) * 0.1)
          ),
          reorderLevel: Math.max(
            5,
            Math.floor(parseInt(item.currentStock) * 0.2)
          ),
        },
        tags: [
          item.category,
          item.brandName,
          ...item.specifications.split(", ").filter(Boolean),
        ],
      };

      // Use the new store method that handles duplicates with latest pricing
      console.log("📦 Submitting product data:", productData);
      const { addOrUpdateProduct } = useInventoryStore.getState();
      const result = await addOrUpdateProduct(productData);
      console.log("📦 Submission result:", result);

      if (result.success && result.data) {
        clearForm();
        const resetForm = () => {
          clearForm();
        };

        // Use the enhanced success popup
        setSuccessData(
          createProductSuccessPopup(result.data, resetForm, result.isUpdate)
        );

        // Refresh inventory data in the store
        const { refreshData } = useInventoryStore.getState();
        await refreshData();
      } else {
        setConfirmationData({
          title: "Error",
          message:
            result.error || "An error occurred while processing the item.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error adding item:", error);
      setConfirmationData({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeItemFromList = (itemId: number) => {
    setItemsList((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmitAll = async () => {
    if (itemsList.length === 0) {
      setConfirmationData({
        title: "No Items to Submit",
        message: "Please add at least one item to the list before submitting.",
        type: "warning",
      });
      return;
    }

    setIsSubmittingAll(true);
    let successCount = 0;
    const failedItems = [];

    try {
      // Submit each item separately using the new store method
      const { addOrUpdateProduct } = useInventoryStore.getState();

      for (const item of itemsList) {
        try {
          const productData = {
            name: item.productName,
            description: item.description,
            brandId: item.brand,
            categoryId: item.category,
            specifications: {
              lightType: item.lightType || undefined,
              color: item.color || undefined,
              size: item.size || undefined,
              watts: item.watts ? parseFloat(item.watts) : undefined,
              wireGauge: item.wireGauge || undefined,
              amperage: item.ampere || undefined, // Note: changed from 'ampere' to 'amperage'
            },
            pricing: {
              purchasePrice: parseFloat(item.purchasePrice),
              sellingPrice: parseFloat(item.sellingPrice),
              unit: item.unit,
            },
            inventory: {
              currentStock: parseInt(item.currentStock),
              minimumStock: Math.max(
                1,
                Math.floor(parseInt(item.currentStock) * 0.1)
              ),
              reorderLevel: Math.max(
                5,
                Math.floor(parseInt(item.currentStock) * 0.2)
              ),
            },
            tags: [
              item.category,
              item.brandName,
              ...item.specifications.split(", ").filter(Boolean),
            ],
          };

          console.log("📦 Batch submitting product data:", productData);
          const result = await addOrUpdateProduct(productData);
          console.log("📦 Batch submission result:", result);

          if (result.success) {
            successCount++;
          } else {
            failedItems.push(item.productName);
          }
        } catch (error) {
          console.error(`Error creating item ${item.productName}:`, error);
          failedItems.push(item.productName);
        }
      }

      // Show results
      if (successCount === itemsList.length) {
        setConfirmationData({
          title: "Success!",
          message: `All ${successCount} items created successfully!`,
          type: "success",
          actions: [
            {
              label: "Great!",
              action: () => {
                setItemsList([]);
                clearForm();
                setConfirmationData(null);

                // Refresh inventory data
                const { refreshData } = useInventoryStore.getState();
                refreshData();
              },
              variant: "default",
            },
          ],
        });
      } else if (successCount > 0) {
        setConfirmationData({
          title: "Partial Success",
          message: `${successCount} items created successfully. ${
            failedItems.length
          } items failed: ${failedItems.join(", ")}`,
          type: "warning",
        });
      } else {
        setConfirmationData({
          title: "Submission Failed",
          message: "Failed to create all items. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting items:", error);
      setConfirmationData({
        title: "Error",
        message: "An unexpected error occurred while submitting items.",
        type: "error",
      });
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // This will add the current item to the list
    addItemToList();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Add New Item</h1>
          <p className="text-gray-400 mt-1">
            Add a new item to your inventory with detailed specifications
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Item Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
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
                disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                    availableBrands.length > 0
                      ? "Select brand"
                      : "No brands available"
                  }
                  className="bg-gray-800 border-gray-700"
                  disabled={
                    !formData.category ||
                    isLoading ||
                    availableBrands.length === 0
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-gray-300">
                  Purchase Price *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-gray-300">
                  Selling Price *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Add any additional description..."
                disabled={isLoading}
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
                    <span className="text-white">{formData.category}</span>
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !formData.category ||
                  !formData.brand ||
                  !formData.unit
                }
                loading={isLoading}
                className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add to List
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading || isSubmittingAll}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Items List */}
      {itemsList.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items to Submit ({itemsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {itemsList.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-2">
                        {index + 1}. {item.productName}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Category:</span>
                          <p className="text-white">
                            {getCategoryLabel(item.category)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Brand:</span>
                          <p className="text-white">{item.brandName}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Stock:</span>
                          <p className="text-white">
                            {item.currentStock} {item.unit}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Price:</span>
                          <p className="text-white">
                            {currency}
                            {item.sellingPrice}
                          </p>
                        </div>
                      </div>
                      {item.specifications && (
                        <div className="mt-2">
                          <span className="text-gray-400 text-sm">
                            Specifications:
                          </span>
                          <p className="text-white text-sm">
                            {item.specifications}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItemFromList(item.id)}
                      className="ml-4 text-red-400 border-red-400 hover:bg-red-900/20"
                      disabled={isSubmittingAll}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {/* Submit All Button */}
              <div className="flex gap-4 pt-4 border-t border-gray-700">
                <Button
                  type="button"
                  onClick={handleSubmitAll}
                  disabled={isSubmittingAll || itemsList.length === 0}
                  loading={isSubmittingAll}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4" />
                  {isSubmittingAll
                    ? "Submitting All Items..."
                    : `Submit All ${itemsList.length} Items`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmationData({
                      title: "Clear All Items",
                      message:
                        "Are you sure you want to clear all items from the list? This action cannot be undone.",
                      type: "warning",
                      actions: [
                        {
                          label: "Cancel",
                          action: () => setConfirmationData(null),
                          variant: "outline",
                        },
                        {
                          label: "Clear All",
                          action: () => {
                            setItemsList([]);
                            setConfirmationData(null);
                          },
                          variant: "destructive",
                        },
                      ],
                    });
                  }}
                  disabled={isSubmittingAll}>
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Popup */}
      {successData && (
        <SuccessPopup
          isOpen={!!successData}
          onClose={() => setSuccessData(null)}
          data={successData}
        />
      )}

      {/* Confirmation Popup */}
      {confirmationData && (
        <ConfirmationPopup
          isOpen={!!confirmationData}
          onClose={() => setConfirmationData(null)}
          data={confirmationData}
        />
      )}
    </div>
  );
}
