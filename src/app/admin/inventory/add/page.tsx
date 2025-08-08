"use client";

import { useState, useEffect, useRef } from "react";

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

import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Package, Zap, DollarSign } from "lucide-react";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore } from "@/store/inventory-store";
import { currency } from "@/lib/inventory-data";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";
import { validateProduct } from "@/lib/dynamic-validation";

// Using data from helper file instead of local arrays

interface InventoryItem {
  id: number;
  category: string;
  lightType?: string;
  color?: string;
  size?: string;
  wattage?: string;
  wireGauge?: string;
  amperage?: string;
  voltage?: string;
  material?: string;
  core?: string;
  mfd?: string;
  brand: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  unit: string;
  description?: string;
  productName: string;
  brandName: string;
  specifications: string;
  error?: string;
}

export default function AddInventoryItemPage() {
  const router = useRouter();
  const { brands, fetchBrands } = useBrandStore();
  const { fetchCategories, getActiveCategories, getCategoryById } =
    useCategoryStore();
  const { products, fetchProducts } = useInventoryStore();
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<SuccessPopupData | null>(null);
  const [confirmationData, setConfirmationData] =
    useState<ConfirmationData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);

  const [selectedPreviousItem, setSelectedPreviousItem] = useState<string>("");
  const [fieldsDisabled, setFieldsDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgress = useRef(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts(); // Fetch existing products for previous item dropdown

    // Fetch specification data from Sanity
    const { fetchSpecificationOptions, fetchCategoryFieldMappings } =
      useSpecificationsStore.getState();
    fetchSpecificationOptions();
    fetchCategoryFieldMappings();
  }, [fetchBrands, fetchCategories, fetchProducts]);

  const [formData, setFormData] = useState({
    category: "",
    // Dynamic specification fields
    lightType: "",
    color: "",
    size: "",
    wattage: "", // Changed from 'watts' to 'wattage' for consistency
    wireGauge: "",
    amperage: "", // Changed from 'ampere' to 'amperage' for consistency
    voltage: "",
    material: "",
    core: "",
    mfd: "", // Cap MFD field
    // Fixed fields
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

  const units = useSpecificationsStore.getState().unitOptions;

  // Create dropdown options for previous items
  const previousItemOptions = products
    .filter((product) => product.isActive && !product.deleted)
    .map((product) => ({
      value: product._id,
      label: `${product.name} - ${product.brand.name}`,
    }));

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePreviousItemSelect = (productId: string) => {
    if (!productId) {
      // Clear selection - enable all fields
      setSelectedPreviousItem("");
      setFieldsDisabled(false);
      clearForm();
      return;
    }

    const selectedProduct = products.find((p) => p._id === productId);
    if (!selectedProduct) return;

    setSelectedPreviousItem(productId);
    setFieldsDisabled(true);

    // Copy all configuration from previous item, including prices
    setFormData({
      category: selectedProduct.category._id,
      // Dynamic specification fields - copy from previous
      lightType: selectedProduct.specifications.lightType || "",
      color: selectedProduct.specifications.color || "",
      size: selectedProduct.specifications.size || "",
      wattage: selectedProduct.specifications.wattage?.toString() || "",
      wireGauge: selectedProduct.specifications.wireGauge || "",
      amperage: selectedProduct.specifications.amperage || "",
      voltage: selectedProduct.specifications.voltage || "",
      material: selectedProduct.specifications.material || "",
      core: selectedProduct.specifications.core || "",
      mfd: selectedProduct.specifications.mfd?.toString() || "",
      // Fixed fields - copy brand, unit, and prices from previous item
      brand: selectedProduct.brand._id,
      unit: selectedProduct.pricing.unit,
      description: selectedProduct.description || "",
      purchasePrice: selectedProduct.pricing.purchasePrice.toString(),
      sellingPrice: selectedProduct.pricing.sellingPrice.toString(),
      // Only current stock remains empty for manual entry
      currentStock: "",
    });

    // Clear any existing errors
    setFormErrors({});
  };

  // Filter active brands based on selected category (all brands are available for all categories)
  const availableBrands = brands
    .filter((brand) => brand.isActive)
    .map((brand) => ({
      value: brand._id,
      label: brand.name,
    }));

  // Helper function to get category label
  const getCategoryLabel = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category?.name || "Unknown Category";
  };

  const clearForm = () => {
    setFormData({
      category: "",
      // Dynamic specification fields
      lightType: "",
      color: "",
      size: "",
      wattage: "",
      wireGauge: "",
      amperage: "",
      voltage: "",
      material: "",
      core: "",
      mfd: "", // Cap MFD field
      // Fixed fields
      brand: "",
      purchasePrice: "",
      sellingPrice: "",
      currentStock: "",
      unit: "",
      description: "",
    });
    setFormErrors({});
    setSelectedPreviousItem("");
    setFieldsDisabled(false);
  };

  const validateForm = async () => {
    try {
      const errors = await validateProduct(formData);
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
    } catch (error) {
      console.error("Validation error:", error);
      setConfirmationData({
        title: "Error",
        message:
          "Failed to validate the form. Please check your network connection and try again.",
        type: "error",
      });
      return false;
    }
  };

  const addItemToList = async () => {
    try {
      // Note: isSubmitting is already set by handleSubmit, no need to set it again
      console.log("📝 Processing item for list addition");

      // Validate form before adding to list
      if (!(await validateForm())) {
        setIsSubmitting(false);
        return;
      }

      // Get brand name for display
      const selectedBrand = brands.find(
        (brand) => brand._id === formData.brand
      );
      const brandName = selectedBrand ? selectedBrand.name : "Unknown Brand";

      // Get category label safely
      let categoryLabel = "";
      try {
        categoryLabel = getCategoryLabel(formData.category);
      } catch (error) {
        console.error("Error getting category label:", error);
        categoryLabel = "Unknown Category";
      }

      // Build product name with specifications
      let productName = `${categoryLabel} - ${brandName}`;
      const specs = [];
      if (formData.lightType) specs.push(formData.lightType);
      if (formData.color) specs.push(formData.color);
      if (formData.size) specs.push(formData.size);
      if (formData.wattage) specs.push(`${formData.wattage}W`);
      if (formData.wireGauge) specs.push(formData.wireGauge);
      if (formData.amperage) specs.push(`${formData.amperage}A`);
      if (formData.mfd) specs.push(`${formData.mfd}MFD`);

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
        // Reset submission state
        setIsSubmitting(false);
        submissionInProgress.current = false;
        console.log("✅ Item added to existing list - submission complete");
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
              try {
                console.log("📋 Adding item to list and continuing");
                setItemsList([newItem]);
                clearForm();
                setConfirmationData(null);
                // Reset submission state
                setIsSubmitting(false);
                submissionInProgress.current = false;
                console.log("✅ Item added to new list - ready for more items");
              } catch (error) {
                console.error("Error adding item to list:", error);
                setConfirmationData({
                  title: "Error",
                  message: "Failed to add item to list. Please try again.",
                  type: "error",
                });
                // Reset submission state on error
                setIsSubmitting(false);
                submissionInProgress.current = false;
              }
            },
            variant: "default",
          },
          {
            label: "Save This Item Only",
            action: () => {
              try {
                console.log("� Save TThis Item Only clicked");
                // Don't reset submission state here - let handleSingleItemSubmit manage it
                handleSingleItemSubmit(newItem);
                setConfirmationData(null);
              } catch (error) {
                console.error("Error saving item:", error);
                setConfirmationData({
                  title: "Error",
                  message: "Failed to save the item. Please try again.",
                  type: "error",
                });
                // Reset submission state on error
                setIsSubmitting(false);
                submissionInProgress.current = false;
              }
            },
            variant: "outline",
          },
        ],
      });
    } catch (error) {
      console.error("Error in addItemToList:", error);
      setConfirmationData({
        title: "Error",
        message:
          "An unexpected error occurred while processing your request. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unified submit function that handles both single items and multiple items
  const submitItems = async (items: InventoryItem[]) => {
    // Check if already in progress
    if (isLoading) {
      console.log("🚫 Submit already in progress");
      return;
    }

    console.log(`💾 Starting submission for ${items.length} item(s)`);
    setIsLoading(true);

    let successCount = 0;
    const failedItems: InventoryItem[] = [];

    try {
      const { addOrUpdateProduct, refreshData } = useInventoryStore.getState();

      // Process each item
      for (const item of items) {
        try {
          console.log(`📦 Processing item: ${item.productName}`);

          // Validate required fields
          if (!item.brand) {
            throw new Error("Brand is required");
          }
          if (!item.category) {
            throw new Error("Category is required");
          }
          if (!item.currentStock || isNaN(parseInt(item.currentStock))) {
            throw new Error("Valid current stock is required");
          }
          if (!item.unit) {
            throw new Error("Unit is required");
          }

          // Parse numeric values with validation
          const purchasePrice = parseFloat(item.purchasePrice);
          const sellingPrice = parseFloat(item.sellingPrice);
          const currentStock = parseInt(item.currentStock);

          if (isNaN(purchasePrice) || purchasePrice < 0) {
            throw new Error("Valid purchase price is required");
          }
          if (isNaN(sellingPrice) || sellingPrice < 0) {
            throw new Error("Valid selling price is required");
          }
          if (isNaN(currentStock) || currentStock < 0) {
            throw new Error("Valid current stock is required");
          }

          // Generate product name using category name as base
          const selectedBrand = brands.find(
            (brand) => brand._id === item.brand
          );
          const brandName = selectedBrand
            ? selectedBrand.name
            : "Unknown Brand";

          let categoryLabel = "";
          try {
            categoryLabel = getCategoryLabel(item.category);
          } catch (error) {
            console.error("Error getting category label:", error);
            categoryLabel = "Unknown Category";
          }

          // Build product name with category as base
          let productName = `${categoryLabel} - ${brandName}`;
          const specs = [];
          if (item.lightType) specs.push(item.lightType);
          if (item.color) specs.push(item.color);
          if (item.size) specs.push(item.size);
          if (item.wattage) specs.push(`${item.wattage}W`);
          if (item.wireGauge) specs.push(item.wireGauge);
          if (item.amperage) specs.push(`${item.amperage}A`);
          if (item.mfd) specs.push(`${item.mfd}MFD`);

          if (specs.length > 0) {
            productName += ` (${specs.join(", ")})`;
          }

          const productData = {
            name: productName,
            description: item.description?.trim() || "",
            brandId: item.brand,
            categoryId: item.category,
            specifications: {
              lightType: item.lightType?.trim() || undefined,
              color: item.color?.trim() || undefined,
              size: item.size?.trim() || undefined,
              wattage: item.wattage ? parseFloat(item.wattage) : undefined,
              voltage: item.voltage?.trim() || undefined,
              wireGauge: item.wireGauge?.trim() || undefined,
              amperage: item.amperage?.trim() || undefined,
              material: item.material?.trim() || undefined,
              core: item.core?.trim() || undefined,
              mfd: item.mfd ? parseFloat(item.mfd) : undefined,
            },
            pricing: {
              purchasePrice: purchasePrice,
              sellingPrice: sellingPrice,
              unit: item.unit,
            },
            inventory: {
              currentStock: currentStock,
              minimumStock: Math.max(1, Math.floor(currentStock * 0.1)),
              reorderLevel: Math.max(5, Math.floor(currentStock * 0.2)),
            },
            tags: [
              item.category,
              item.brandName,
              ...(item.specifications
                ? item.specifications.split(", ").filter(Boolean)
                : []),
            ],
          };

          console.log("📦 Submitting product data:", productData);
          const result = await addOrUpdateProduct(productData);
          console.log("📦 Submission result:", result);

          if (!result) {
            throw new Error("No response received from the server");
          }

          if (result.success && result.data) {
            successCount++;
            console.log(
              `✅ Successfully processed item ${successCount}/${items.length}`
            );

            // For single item submission, show success popup
            if (items.length === 1) {
              const enhancedData = {
                ...result.data,
                category: {
                  name: categoryLabel,
                },
                brand: {
                  name: brandName,
                },
              };

              setSuccessData(
                createProductSuccessPopup(
                  enhancedData,
                  undefined,
                  result.isUpdate
                )
              );
              clearForm();
            }
          } else {
            failedItems.push({ ...item, error: result.error });
            console.log(`❌ Failed to process item: ${result.error}`);
          }
        } catch (itemError) {
          const errorMessage =
            itemError instanceof Error
              ? itemError.message
              : "An unexpected error occurred.";
          failedItems.push({ ...item, error: errorMessage });
          console.log(`❌ Failed to process item: ${errorMessage}`);
        }
      }

      // Refresh inventory data after all items are processed
      await refreshData();

      // Handle results based on submission type
      if (items.length === 1) {
        // Single item - success popup already shown above, or error handling
        if (failedItems.length > 0) {
          setConfirmationData({
            title: "Error",
            message:
              failedItems[0].error ||
              "An error occurred while processing the item.",
            type: "error",
          });
        }
      } else {
        // Multiple items - show summary
        if (successCount === items.length) {
          setConfirmationData({
            title: "All Items Submitted Successfully",
            message: `${successCount} items have been successfully added to your inventory.`,
            type: "success",
            actions: [
              {
                label: "Great!",
                action: () => {
                  setItemsList([]);
                  setConfirmationData(null);
                },
                variant: "default",
              },
            ],
          });
        } else {
          setConfirmationData({
            title: "Submission Complete",
            message: `${successCount} out of ${items.length} items submitted successfully.`,
            type: successCount > 0 ? "warning" : "error",
            actions: [
              {
                label: "Acknowledge",
                action: () => {
                  setItemsList(failedItems);
                  setConfirmationData(null);
                },
                variant: "default",
              },
            ],
          });
        }
      }
    } catch (error) {
      console.error("💥 Error in submitItems:", error);
      setConfirmationData({
        title: "Error",
        message: "An unexpected error occurred while submitting items.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
      submissionInProgress.current = false;
      console.log("✅ Submission process completed");
    }
  };

  // Legacy function for single item submission (now just calls submitItems)
  const handleSingleItemSubmit = async (item: InventoryItem) => {
    await submitItems([item]);
  };

  // Legacy function for multiple items submission (now just calls submitItems)
  const handleSubmitAll = async () => {
    if (itemsList.length === 0) {
      setConfirmationData({
        title: "No Items to Submit",
        message: "Please add at least one item to the list before submitting.",
        type: "warning",
      });
      return;
    }

    await submitItems(itemsList);
  };

  const removeItemFromList = (itemId: number) => {
    setItemsList((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission - set state immediately
    if (isLoading || isSubmitting || submissionInProgress.current) {
      console.log("🚫 Form submission blocked - already in progress");
      return;
    }

    // Set state immediately to prevent double clicks
    setIsSubmitting(true);
    submissionInProgress.current = true;
    console.log("🚀 Form submitted - starting validation and submission");

    // Handle validation and submission asynchronously
    validateAndAddItem();
  };

  const validateAndAddItem = async () => {
    try {
      console.log("🔍 Starting form validation");
      const isValid = await validateForm();

      if (!isValid) {
        console.log("❌ Form validation failed");
        setIsSubmitting(false);
        submissionInProgress.current = false;
        return;
      }

      console.log("✅ Form validation passed - proceeding to add item");
      await addItemToList();
    } catch (error) {
      console.error("💥 Error in validateAndAddItem:", error);
      setIsSubmitting(false);
      submissionInProgress.current = false;
      setConfirmationData({
        title: "Error",
        message:
          "An unexpected error occurred while processing your request. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-gray-600 hover:bg-gray-800">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Button>
      </div>

      <Card className="bg-gray-800 border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-bold !leading-[125%] text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            Add New Inventory Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
            {/* Previous Item Selection */}
            <div className="space-y-2 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
              <Label
                htmlFor="previousItem"
                className="text-gray-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                Add Previous Item (Optional)
              </Label>
              <Dropdown
                options={[
                  {
                    value: "",
                    label: "Select a previous item to copy configuration",
                  },
                  ...previousItemOptions,
                ]}
                value={selectedPreviousItem}
                onValueChange={handlePreviousItemSelect}
                placeholder="Choose from existing items"
                className="bg-gray-800 border-gray-700"
                disabled={isLoading}
              />
              {selectedPreviousItem && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-blue-400">
                    ✓ Configuration copied. Purchase Price, Selling Price, and
                    Purchased Items remain editable (highlighted in blue).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviousItemSelect("")}
                    className="text-xs border-gray-600 hover:bg-gray-700">
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>

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
                disabled={isLoading || fieldsDisabled}
              />

              {/* Dynamic Specification Fields */}
              <DynamicSpecificationFields
                categoryId={formData.category}
                formData={formData}
                onFieldChange={handleInputChange}
                errors={formErrors}
                disabled={isLoading || fieldsDisabled}
              />

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
                      availableBrands.length === 0 ||
                      fieldsDisabled
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
                      className={`pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${
                        fieldsDisabled ? "bg-blue-900/20 border-blue-600" : ""
                      }`}
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
                      className={`pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${
                        fieldsDisabled ? "bg-blue-900/20 border-blue-600" : ""
                      }`}
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
                    className={`bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${
                      fieldsDisabled ? "bg-blue-900/20 border-blue-600" : ""
                    }`}
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
                    disabled={isLoading || fieldsDisabled}
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
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={4}
                  placeholder="Enter a brief description of the item"
                  disabled={isLoading || fieldsDisabled}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={clearForm}
                disabled={isLoading}>
                Clear Form
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
                loading={isLoading || isSubmitting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4" />
                {itemsList.length > 0 ? "Add to List & Continue" : "Save Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Items List Card */}
      {itemsList.length > 0 && (
        <Card className="mt-8 bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Ready to Submit List ({itemsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {itemsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg text-white">
                        {item.productName}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-sm">
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
              <div className="flex gap-4 pt-2 md:pt-4 border-t border-gray-700">
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
