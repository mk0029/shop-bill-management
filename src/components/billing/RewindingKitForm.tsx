"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { BillItem } from "@/lib/inventory-management";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { useProducts } from "@/hooks/use-sanity-data";

interface RewindingKitFormProps {
  onAddItem: (item: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specifications?: string;
    category?: string;
    brand?: string;
    unit?: string;
  }) => void;
}

interface RewindingFormData {
  id: string;
  selectedStarterId: string;
  kitName: string;
  kitType: "Cooler" | "Motor";
  boreSize: string;
  sizeInInches: string;
  multiSpeed: boolean;
  heavyLoadOption: string;
  oldWindingMaterial: "Copper" | "Aluminum";
  newWindingMaterial: "Copper" | "Aluminum";
  priceDifference: string;
  windingRate: string;
  quantity: number;
}

const initialKitState: RewindingFormData = {
  id: "",
  selectedStarterId: "",
  kitName: "",
  kitType: "Cooler",
  boreSize: "",
  sizeInInches: "",
  multiSpeed: false,
  heavyLoadOption: "",
  oldWindingMaterial: "Copper",
  newWindingMaterial: "Copper",
  priceDifference: "",
  windingRate: "",
  quantity: 1,
};

const kitTypeOptions = [
  { value: "Cooler", label: "Cooler Kit" },
  { value: "Motor", label: "Motor Kit" },
];

const materialOptions = [
  { value: "Copper", label: "Copper" },
  { value: "Aluminum", label: "Aluminum" },
];

const heavyLoadOptions = [
  { value: "", label: "None" },
  { value: "0.5hp", label: "0.5 HP" },
  { value: "1hp", label: "1 HP" },
  { value: "1.5hp", label: "1.5 HP" },
  { value: "2hp", label: "2 HP" },
  { value: "2.5hp", label: "2.5 HP" },
  { value: "3hp", label: "3 HP" },
];

function SingleRewindingForm({
  formData,
  onUpdate,
  onRemove,
  canRemove,
  starterProducts,
}: {
  formData: RewindingFormData;
  onUpdate: (id: string, data: Partial<RewindingFormData>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  starterProducts: unknown[];
}) {
  const selectedStarter = starterProducts.find(
    (p) => p._id === formData.selectedStarterId
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onUpdate(formData.id, { [name]: value });
  };

  const handleSelectChange = (
    field: keyof RewindingFormData,
    value: string
  ) => {
    onUpdate(formData.id, { [field]: value });
  };

  const handleStarterSelect = (starterId: string) => {
    const starter = starterProducts.find((p) => p._id === starterId);
    if (starter) {
      // Auto-fill form fields based on starter data
      const updates: Partial<RewindingFormData> = {
        selectedStarterId: starterId,
        kitName: starter.name,
        kitType: starter.specifications?.kitType || "Cooler",
        boreSize: starter.specifications?.boreSize || "",
        sizeInInches: starter.specifications?.sizeInInches || "",
        windingRate: starter.pricing?.sellingPrice?.toString() || "",
      };
      onUpdate(formData.id, updates);
    } else {
      onUpdate(formData.id, { selectedStarterId: starterId });
    }
  };

  const isFieldDisabled = (fieldName: string) => {
    if (!selectedStarter) return false;

    // Disable fields that are auto-filled from starter data
    const disabledFields = ["kitName", "kitType", "boreSize", "sizeInInches"];
    return disabledFields.includes(fieldName);
  };

  const starterOptions = [
    { value: "", label: "Select existing starter data..." },
    ...starterProducts.map((product) => ({
      value: product._id,
      label: `${product.name} - ${product.brand?.name || "No Brand"}`,
    })),
  ];

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Custom Service/Item</CardTitle>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(formData.id)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Starter Data Dropdown */}
        <div>
          <Label>Select Existing Starter Data (Optional)</Label>
          <Dropdown
            options={starterOptions}
            value={formData.selectedStarterId}
            onValueChange={handleStarterSelect}
            placeholder="Choose from existing starter data..."
          />
          {selectedStarter && (
            <p className="text-sm text-gray-500 mt-1">
              Selected: {selectedStarter.name} - Fields will be auto-filled and
              disabled
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor={`kitName-${formData.id}`}>Kit Name</Label>
            <Input
              id={`kitName-${formData.id}`}
              name="kitName"
              value={formData.kitName}
              onChange={handleInputChange}
              disabled={isFieldDisabled("kitName")}
              className={isFieldDisabled("kitName") ? "bg-gray-100" : ""}
            />
          </div>
          <div>
            <Label htmlFor={`kitType-${formData.id}`}>Kit Type</Label>
            <Dropdown
              options={kitTypeOptions}
              value={formData.kitType}
              onValueChange={(value) => handleSelectChange("kitType", value)}
              disabled={isFieldDisabled("kitType")}
            />
          </div>
          <div>
            <Label htmlFor={`boreSize-${formData.id}`}>Kit Bore Size</Label>
            <Input
              id={`boreSize-${formData.id}`}
              name="boreSize"
              type="number"
              value={formData.boreSize}
              onChange={handleInputChange}
              disabled={isFieldDisabled("boreSize")}
              className={isFieldDisabled("boreSize") ? "bg-gray-100" : ""}
            />
          </div>
          <div>
            <Label htmlFor={`sizeInInches-${formData.id}`}>
              Kit Size in Inches
            </Label>
            <Input
              id={`sizeInInches-${formData.id}`}
              name="sizeInInches"
              type="number"
              value={formData.sizeInInches}
              onChange={handleInputChange}
              disabled={isFieldDisabled("sizeInInches")}
              className={isFieldDisabled("sizeInInches") ? "bg-gray-100" : ""}
            />
          </div>
          {formData.kitType === "Cooler" && (
            <div className="flex items-center space-x-2">
              <Switch
                id={`multiSpeed-${formData.id}`}
                checked={formData.multiSpeed}
                onCheckedChange={(checked) =>
                  onUpdate(formData.id, { multiSpeed: checked })
                }
              />
              <Label htmlFor={`multiSpeed-${formData.id}`}>Multi-Speed</Label>
            </div>
          )}
        </div>

        <div>
          <Label>Heavy Load Option</Label>
          <Dropdown
            options={heavyLoadOptions}
            value={formData.heavyLoadOption}
            onValueChange={(value) =>
              handleSelectChange("heavyLoadOption", value)
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Old Winding Material</Label>
            <Dropdown
              options={materialOptions}
              value={formData.oldWindingMaterial}
              onValueChange={(value) =>
                handleSelectChange("oldWindingMaterial", value)
              }
            />
          </div>
          <div>
            <Label>New Winding Material</Label>
            <Dropdown
              options={materialOptions}
              value={formData.newWindingMaterial}
              onValueChange={(value) =>
                handleSelectChange("newWindingMaterial", value)
              }
            />
          </div>
          {formData.oldWindingMaterial !== formData.newWindingMaterial && (
            <div>
              <Label htmlFor={`priceDifference-${formData.id}`}>
                Price Difference
              </Label>
              <Input
                id={`priceDifference-${formData.id}`}
                name="priceDifference"
                type="number"
                value={formData.priceDifference}
                onChange={handleInputChange}
              />
            </div>
          )}
          <div>
            <Label htmlFor={`windingRate-${formData.id}`}>Winding Rate</Label>
            <Input
              id={`windingRate-${formData.id}`}
              name="windingRate"
              type="number"
              value={formData.windingRate}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor={`quantity-${formData.id}`}>Quantity</Label>
            <Input
              id={`quantity-${formData.id}`}
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RewindingKitForm({ onAddItem }: RewindingKitFormProps) {
  const [rewindingForms, setRewindingForms] = useState<RewindingFormData[]>([
    { ...initialKitState, id: crypto.randomUUID() },
  ]);

  const { activeProducts } = useProducts();

  // Filter products that could be starter data (you can adjust this filter based on your needs)
  const starterProducts = activeProducts.filter(
    (product) =>
      product.category?.name?.toLowerCase().includes("starter") ||
      product.name.toLowerCase().includes("starter") ||
      product.category?.name?.toLowerCase().includes("motor") ||
      product.category?.name?.toLowerCase().includes("cooler")
  );

  const updateForm = (id: string, updates: Partial<RewindingFormData>) => {
    setRewindingForms((prev) =>
      prev.map((form) => (form.id === id ? { ...form, ...updates } : form))
    );
  };

  const removeForm = (id: string) => {
    setRewindingForms((prev) => prev.filter((form) => form.id !== id));
  };

  const addNewForm = () => {
    setRewindingForms((prev) => [
      ...prev,
      { ...initialKitState, id: crypto.randomUUID() },
    ]);
  };

  const handleSubmitAllRewindingServices = () => {
    const validForms = rewindingForms.filter((form) => {
      const { kitName, windingRate, quantity } = form;
      return kitName && windingRate && quantity > 0;
    });

    if (validForms.length === 0) {
      alert(
        "Please fill in at least one complete service with Kit Name, Winding Rate, and Quantity."
      );
      return;
    }

    validForms.forEach((formData) => {
      const {
        kitName,
        windingRate,
        priceDifference,
        quantity,
        kitType,
        boreSize,
        sizeInInches,
        multiSpeed,
        heavyLoadOption,
        oldWindingMaterial,
        newWindingMaterial,
      } = formData;

      const totalUnitPrice =
        parseFloat(windingRate) + (parseFloat(priceDifference) || 0);

      // Create a readable specifications string
      const specs = [];
      if (boreSize) specs.push(`Bore: ${boreSize}`);
      if (sizeInInches) specs.push(`Size: ${sizeInInches}"`);
      if (multiSpeed) specs.push("Multi-Speed");
      if (heavyLoadOption) specs.push(`Load: ${heavyLoadOption}`);
      if (oldWindingMaterial !== newWindingMaterial) {
        specs.push(`Material: ${oldWindingMaterial} → ${newWindingMaterial}`);
      } else {
        specs.push(`Material: ${oldWindingMaterial}`);
      }

      const specificationsText =
        specs.length > 0 ? specs.join(", ") : "Custom service";

      const newItem = {
        productName: `${kitType} Kit - ${kitName}`,
        quantity: quantity,
        unitPrice: totalUnitPrice,
        specifications: specificationsText,
        category: "Rewinding Service",
        brand: "Custom",
        unit: "service",
      };

      onAddItem(newItem);
    });

    // Reset forms after successful submission
    setRewindingForms([{ ...initialKitState, id: crypto.randomUUID() }]);
  };

  return (
    <div className="space-y-6">
      {rewindingForms.map((form, index) => (
        <SingleRewindingForm
          key={form.id}
          formData={form}
          onUpdate={updateForm}
          onRemove={removeForm}
          canRemove={rewindingForms.length > 1}
          starterProducts={starterProducts}
        />
      ))}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={addNewForm}
          className="flex-1 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add More Service/Item
        </Button>

        <Button
          onClick={handleSubmitAllRewindingServices}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          Submit All Services
        </Button>
      </div>
    </div>
  );
}
