"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import { Plus, X, Package } from "lucide-react";

interface ManualItemFormProps {
  onAddItem: (item: {
    productId?: string;
    productName: string;
    category?: string;
    brand?: string;
    specifications?: string;
    quantity: number;
    unitPrice?: number;
    unit?: string;
  }) => void;
  categories: any[];
  brands: any[];
}

export const ManualItemForm = ({
  onAddItem,
  categories,
  brands,
}: ManualItemFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    brand: "",
    specifications: "",
    quantity: 1,
    unitPrice: 0,
    unit: "pcs",
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.productName.trim()) {
      alert("Please enter a product name");
      return;
    }

    if (formData.quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (formData.unitPrice < 0) {
      alert("Please enter a valid unit price");
      return;
    }

    onAddItem({
      productName: formData.productName.trim(),
      category: formData.category,
      brand: formData.brand,
      specifications: formData.specifications.trim(),
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      unit: formData.unit,
    });

    // Reset form
    setFormData({
      productName: "",
      category: "",
      brand: "",
      specifications: "",
      quantity: 1,
      unitPrice: 0,
      unit: "pcs",
    });

    setIsExpanded(false);
  };

  const unitOptions = [
    { value: "pcs", label: "Pieces" },
    { value: "kg", label: "Kilograms" },
    { value: "gm", label: "Grams" },
    { value: "ltr", label: "Liters" },
    { value: "ml", label: "Milliliters" },
    { value: "mtr", label: "Meters" },
    { value: "ft", label: "Feet" },
    { value: "hrs", label: "Hours" },
    { value: "service", label: "Service" },
  ];

  if (!isExpanded) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            variant="default">
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Item
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Add Manual Item
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Name */}
          <div>
            <Label className="text-gray-300 mb-2 block">
              Product/Service Name *
            </Label>
            <Input
              value={formData.productName}
              onChange={(e) => handleInputChange("productName", e.target.value)}
              placeholder="Enter product or service name"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Category and Brand Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Category</Label>
              <Dropdown
                options={[
                  { value: "", label: "Select Category" },
                  ...categories.map((cat) => ({
                    value: cat.name,
                    label: cat.name,
                  })),
                  { value: "custom", label: "Custom/Other" },
                ]}
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
                placeholder="Select category"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Brand</Label>
              <Dropdown
                options={[
                  { value: "", label: "Select Brand" },
                  ...brands.map((brand) => ({
                    value: brand.name,
                    label: brand.name,
                  })),
                  { value: "custom", label: "Custom/Other" },
                ]}
                value={formData.brand}
                onValueChange={(value) => handleInputChange("brand", value)}
                placeholder="Select brand"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          {/* Specifications */}
          <div>
            <Label className="text-gray-300 mb-2 block">
              Specifications/Description
            </Label>
            <Textarea
              value={formData.specifications}
              onChange={(e) =>
                handleInputChange("specifications", e.target.value)
              }
              placeholder="Enter specifications, model, or description"
              className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
            />
          </div>

          {/* Quantity, Unit Price, and Unit Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) =>
                  handleInputChange("quantity", parseInt(e.target.value) || 1)
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Unit Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) =>
                  handleInputChange(
                    "unitPrice",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Unit</Label>
              <Dropdown
                options={unitOptions}
                value={formData.unit}
                onValueChange={(value) => handleInputChange("unit", value)}
                placeholder="Select unit"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          {/* Total Preview */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-white font-semibold">
                ₹{(formData.quantity * formData.unitPrice).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add to Bill
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
