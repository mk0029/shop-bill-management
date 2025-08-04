"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { SuccessPopup, createProductSuccessPopup } from "@/components/ui/success-popup";
import { createProduct } from "@/lib/form-service";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Package, Zap, DollarSign, AlertTriangle } from "lucide-react";
import {
  itemCategories,
  lightTypes,
  colors,
  sizes,
  wireGauges,
  ampereRatings,
  units,
  popularBrands,
  currency,
  getCategoryLabel,
  getLightTypeLabel,
  getBrandLabel,
  getUnitLabel,
  getItemSpecifications
} from "@/lib/inventory-data";

// Using data from helper file instead of local arrays

export default function AddInventoryItemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if item is a light
  const isLightItem = formData.category === "light";
  
  // Check if light item needs color field
  const needsColor = isLightItem && formData.lightType;
  
  // Check if light item needs size field
  const needsSize = isLightItem && ["panel", "concealed", "tubelight"].includes(formData.lightType);
  
  // Check if item needs watts field
  const needsWatts = ["light", "motor", "pump"].includes(formData.category);
  
  // Check if item needs wire gauge
  const needsWireGauge = formData.category === "wire";
  
  // Check if item needs ampere
  const needsAmpere = ["switch", "socket", "mcb"].includes(formData.category);

  // Filter brands based on selected category
  const availableBrands = formData.category 
    ? popularBrands.filter(brand => brand.categories.includes(formData.category))
    : popularBrands;

  const validateForm = () => {
    if (!formData.category) {
      alert("Please select a category");
      return false;
    }
    if (!formData.brand) {
      alert("Please select a brand");
      return false;
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      alert("Please enter a valid purchase price");
      return false;
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      alert("Please enter a valid selling price");
      return false;
    }
    if (!formData.currentStock || parseInt(formData.currentStock) < 0) {
      alert("Please enter a valid current stock");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Create product in Sanity using the actual API
      const productData = {
        name: `${getCategoryLabel(formData.category)} - ${getBrandLabel(formData.brand)}`,
        description: formData.description,
        brandId: formData.brand, // Using brand name as ID for now
        categoryId: formData.category, // Using category name as ID for now
        specifications: {
          lightType: formData.lightType,
          color: formData.color,
          size: formData.size,
          watts: formData.watts,
          wireGauge: formData.wireGauge,
          ampere: formData.ampere,
        },
        pricing: {
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          unit: formData.unit,
        },
        inventory: {
          currentStock: parseInt(formData.currentStock),
          minimumStock: 0,
          reorderLevel: 5,
        },
        tags: [formData.category, formData.brand],
      };

      const result = await createProduct(productData);

      if (result.success && result.data) {
        const resetForm = () => {
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
        
        setSuccessData(createProductSuccessPopup(result.data, resetForm));
      } else {
        // Show error alert
        alert(result.error || "An error occurred while creating the product.");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="p-2"
        >
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
              onValueChange={(value) => handleInputChange("lightType", value)}
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
              onValueChange={(value) => handleInputChange("wireGauge", value)}
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
                  placeholder={formData.category ? "Select brand" : "Select category first"}
                  className="bg-gray-800 border-gray-700"
                  disabled={!formData.category}
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
                    onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
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
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
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
                  onChange={(e) => handleInputChange("currentStock", e.target.value)}
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
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional description..."
              />
            </div>

            {/* Item Preview */}
            {formData.category && formData.brand && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="font-medium text-white mb-3">Item Preview</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Category:</span> <span className="text-white">{getCategoryLabel(formData.category)}</span></p>
                  <p><span className="text-gray-400">Category:</span> <span className="text-white capitalize">{formData.category}</span></p>
                  <p><span className="text-gray-400">Brand:</span> <span className="text-white">{formData.brand}</span></p>
                  {getItemSpecifications() && (
                    <p><span className="text-gray-400">Specifications:</span> <span className="text-white">{getItemSpecifications()}</span></p>
                  )}
                  <p><span className="text-gray-400">Pricing:</span> <span className="text-white">{currency}{formData.purchasePrice} → {currency}{formData.sellingPrice}</span></p>
                  <p><span className="text-gray-400">Stock:</span> <span className="text-white">{formData.currentStock} {formData.unit}</span></p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Adding Item..." : "Add Item"}
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

      {/* Success Popup */}
      {successData && (
        <SuccessPopup
          isOpen={!!successData}
          onClose={() => setSuccessData(null)}
          data={successData}
        />
      )}
    </div>
  );
} 