/* eslint-disable @typescript-eslint/no-explicit-any */
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
  onSubmitted?: () => void;
}

interface RewindingFormData {
  id: string;
  selectedStarterId?: string;
  kitName: string;
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
  oldWindingMaterial: "Copper",
  newWindingMaterial: "Copper",
  priceDifference: "",
  windingRate: "",
  quantity: 1,
};


const materialOptions = [
  { value: "Copper", label: "Copper" },
  { value: "Aluminum", label: "Aluminum" },
];



interface Product {
  _id: string;
  name: string;
  category: { name: string };
  // Add other product fields if needed
}

function SingleRewindingForm({
  formData,
  onUpdate,
  onRemove,
  canRemove,
  starters,
}: {
  formData: RewindingFormData;
  onUpdate: (id: string, data: Partial<RewindingFormData>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  starters: Product[];
}) {
  const { getProductById } = useProducts();

  useEffect(() => {
    if (formData.selectedStarterId) {
      const selectedStarter = getProductById(formData.selectedStarterId);
      if (selectedStarter) {
        onUpdate(formData.id, { kitName: selectedStarter.name });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedStarterId]);

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

  return (
    <Card className="relative bg-gray-800 border border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Custom Service/Item</CardTitle>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(formData.id)}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor={`kitName-${formData.id}`}>Kit Name</Label>
            <Input
              id={`kitName-${formData.id}`}
              name="kitName"
              value={formData.kitName}
              onChange={handleInputChange}
              disabled={!!formData.selectedStarterId}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label>Select Starter (Optional)</Label>
            <Dropdown
              options={starters.map((s) => ({ value: s._id, label: s.name }))}
              value={formData.selectedStarterId}
              onValueChange={(value) => handleSelectChange("selectedStarterId", value)}

            />
          </div>
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
                className="bg-gray-800 border-gray-700 text-white"
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
              className="bg-gray-800 border-gray-700 text-white"
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
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

}

export function RewindingKitForm({ onAddItem, onSubmitted }: RewindingKitFormProps) {
  const { getProductsByCategory } = useProducts();
  const [starters, setStarters] = useState<Product[]>([]);

  useEffect(() => {
    const starterProducts = getProductsByCategory("Starter");
    setStarters(starterProducts as any);
  }, [getProductsByCategory]);

  const [rewindingForms, setRewindingForms] = useState<RewindingFormData[]>([
    { ...initialKitState, id: crypto.randomUUID() },
  ]);

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
        oldWindingMaterial,
        newWindingMaterial,
      } = formData;

      const totalUnitPrice =
        parseFloat(windingRate) + (parseFloat(priceDifference) || 0);

      // Create a readable specifications string
      const specs = [];
      if (oldWindingMaterial !== newWindingMaterial) {
        specs.push(`${oldWindingMaterial} → ${newWindingMaterial}`);
      } else {
        specs.push(oldWindingMaterial);
      }

      const specificationsText =
        specs.length > 0 ? specs.join(", ") : "Custom service";

      const newItem = {
        productName: kitName,
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
    // Inform parent to close the rewinding form if provided
    try { onSubmitted?.(); } catch {}
  };

  return (
    <div className="space-y-6">
      {rewindingForms.map((form) => (
        <SingleRewindingForm
          key={form.id}
          formData={form}
          onUpdate={updateForm}
          onRemove={removeForm}
          canRemove={rewindingForms.length > 1}
          starters={starters}
        />
      ))}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={addNewForm}
          className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600">
          <Plus className="h-4 w-4" />
          Add More Service/Item
        </Button>

        <Button
          onClick={handleSubmitAllRewindingServices}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 hover:border-blue-600">
          Submit All Services
        </Button>
      </div>
    </div>
  );

}
