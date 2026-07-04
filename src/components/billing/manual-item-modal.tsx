"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import { Plus, Package, Calculator } from "lucide-react";
import { toast } from "sonner";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.productName.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (formData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (formData.unitPrice < 0) {
      toast.error("Please enter a valid unit price");
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Item" size="md">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2" style={{ color: "rgba(148,163,184,0.6)" }}>
          <Package className="w-4 h-4" />
          <p className="text-sm">Add custom items or services not in your inventory</p>
        </div>

        {/* Product Name */}
        <div className="space-y-2">
          <Label className="text-sm text-slate-300">
            Product/Service Name <span className="text-red-400">*</span>
          </Label>
          <Input
            value={formData.productName}
            onChange={(e) => handleInputChange("productName", e.target.value)}
            placeholder="Enter product or service name"
            style={glassInputStyle}
          />
        </div>

        {/* Category & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Category</Label>
            <Dropdown
              options={[
                { value: "", label: "Select Category" },
                ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
                { value: "Service", label: "Service" },
                { value: "Labor", label: "Labor" },
                { value: "Custom", label: "Custom/Other" },
              ]}
              value={formData.category}
              onValueChange={(value) => handleInputChange("category", value)}
              placeholder="Select category"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Brand</Label>
            <Dropdown
              options={[
                { value: "", label: "Select Brand" },
                ...brands.map((brand) => ({ value: brand.name, label: brand.name })),
                { value: "Generic", label: "Generic" },
                { value: "Custom", label: "Custom/Other" },
              ]}
              value={formData.brand}
              onValueChange={(value) => handleInputChange("brand", value)}
              placeholder="Select brand"
            />
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-2">
          <Label className="text-sm text-slate-300">Specifications/Description</Label>
          <Textarea
            value={formData.specifications}
            onChange={(e) => handleInputChange("specifications", e.target.value)}
            placeholder="Enter specifications, model, description, or service details"
            className="min-h-[100px]"
            style={glassInputStyle}
          />
        </div>

        {/* Quantity, Price, Unit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Quantity <span className="text-red-400">*</span></Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => handleInputChange("quantity", parseFloat(e.target.value) || 1)}
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Unit Price (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => handleInputChange("unitPrice", parseFloat(e.target.value) || 0)}
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Unit</Label>
            <Dropdown
              options={unitOptions}
              value={formData.unit}
              onValueChange={(value) => handleInputChange("unit", value)}
              placeholder="Select unit"
            />
          </div>
        </div>

        {/* Total Preview */}
        <div style={glassCardStyle} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" style={{ color: "rgba(56,189,248,0.5)" }} />
              <span style={{ color: "rgba(148,163,184,0.6)" }}>Total Amount:</span>
            </div>
            <span className="text-white font-semibold text-lg">
              ₹{(formData.quantity * formData.unitPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            className="flex-1 gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add to Bill
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="border border-white/10 text-slate-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
