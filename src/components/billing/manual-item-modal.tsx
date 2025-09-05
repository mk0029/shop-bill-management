"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import { Plus, Package } from "lucide-react";

interface ManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const ManualItemModal = ({
  isOpen,
  onClose,
  onAddItem,
  categories,
  brands,
}: ManualItemModalProps) => {
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

    // Reset form and close modal
    setFormData({
      productName: "",
      category: "",
      brand: "",
      specifications: "",
      quantity: 1,
      unitPrice: 0,
      unit: "pcs",
    });

    onClose();
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
    { value: "set", label: "Set" },
    { value: "box", label: "Box" },
    { value: "roll", label: "Roll" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Item">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-400" />
          <p className="text-gray-300">
            Add custom items or services not in your inventory
          </p>
        </div>

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
                { value: "Service", label: "Service" },
                { value: "Labor", label: "Labor" },
                { value: "Custom", label: "Custom/Other" },
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
                { value: "Generic", label: "Generic" },
                { value: "Custom", label: "Custom/Other" },
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
            placeholder="Enter specifications, model, description, or service details"
            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
          />
        </div>

        {/* Quantity, Unit Price, and Unit Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-300 mb-2 block">Quantity *</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={formData.quantity}
              onChange={(e) =>
                handleInputChange("quantity", parseFloat(e.target.value) || 1)
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
                handleInputChange("unitPrice", parseFloat(e.target.value) || 0)
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
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Amount:</span>
            <span className="text-white font-semibold text-lg">
              ₹{(formData.quantity * formData.unitPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add to Bill
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
