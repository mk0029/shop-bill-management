/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdate(formData.id, { [name]: value });
  };

  const handleSelectChange = (field: keyof RewindingFormData, value: string) => {
    onUpdate(formData.id, { [field]: value });
  };

  // Config for common inputs
  const inputFields = [
    {
      id: `kitName-${formData.id}`,
      name: "kitName",
      label: "Kit Name",
      type: "text",
      value: formData.kitName,
      disabled: !!formData.selectedStarterId,
    },
    {
      id: `windingRate-${formData.id}`,
      name: "windingRate",
      label: "Winding Rate",
      type: "number",
      value: formData.windingRate,
    },
    {
      id: `quantity-${formData.id}`,
      name: "quantity",
      label: "Quantity",
      type: "number",
      value: formData.quantity,
    },
  ];

  return (
    <Card className="relative bg-gray-800">
      <CardHeader className="flex justify-end pb-0">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(formData.id)}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4">
        {/* Kit Name & Starter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inputFields.slice(0, 1).map((f) => (
            <div key={f.id}>
              <Label htmlFor={f.id}>{f.label}</Label>
              <Input
                id={f.id}
                name={f.name}
                type={f.type}
                value={f.value}
                onChange={handleInputChange}
                disabled={f.disabled}
                className="bg-gray-800 mt-1 border-gray-700 text-white"
              />
            </div>
          ))}

          <div>
            <Label>Select Starter (Optional)</Label>
            <Dropdown className="mt-1"
              options={starters.map((s) => ({ value: s._id, label: s.name }))}
              value={formData.selectedStarterId}
              onValueChange={(v) => handleSelectChange("selectedStarterId", v)}
            />
          </div>
        </div>

        {/* Material Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: "Old Winding Material", field: "oldWindingMaterial" },
            { label: "New Winding Material", field: "newWindingMaterial" },
          ].map((m) => (
            <div key={m.field}>
              <Label>{m.label}</Label>
              <Dropdown className="mt-1"
                options={materialOptions}
                value={formData[m.field as keyof RewindingFormData] as string}
                onValueChange={(v) => handleSelectChange(m.field as any, v)}
              />
            </div>
          ))}

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
                className="bg-gray-800 mt-1 border-gray-700 text-white"
              />
            </div>
          )}

          {inputFields.slice(1).map((f) => (
            <div key={f.id}>
              <Label htmlFor={f.id}>{f.label}</Label>
              <Input
                id={f.id}
                name={f.name}
                type={f.type}
                value={f.value}
                onChange={handleInputChange}
                className="bg-gray-800 mt-1 border-gray-700 text-white"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RewindingKitForm({ onAddItem, onSubmitted }: RewindingKitFormProps) {
  const { getProductsByCategory } = useProducts();
  const [starters, setStarters] = useState<Product[]>([]);

  useEffect(() => {
    setStarters(getProductsByCategory("Starter") as any);
  }, [getProductsByCategory]);

  const [rewindingForms, setRewindingForms] = useState<RewindingFormData[]>([
    { ...initialKitState, id: crypto.randomUUID() },
  ]);

  const updateForm = (id: string, updates: Partial<RewindingFormData>) =>
    setRewindingForms((prev) =>
      prev.map((form) => (form.id === id ? { ...form, ...updates } : form))
    );

  const removeForm = (id: string) =>
    setRewindingForms((prev) => prev.filter((f) => f.id !== id));

  const addNewForm = () =>
    setRewindingForms((prev) => [
      ...prev,
      { ...initialKitState, id: crypto.randomUUID() },
    ]);

  const handleSubmitAllRewindingServices = () => {
    const validForms = rewindingForms.filter(
      ({ kitName, windingRate, quantity }) => kitName && windingRate && quantity > 0
    );

    if (!validForms.length) {
      alert("Please fill in at least one complete service.");
      return;
    }

    validForms.forEach(
      ({
        kitName,
        windingRate,
        priceDifference,
        quantity,
        oldWindingMaterial,
        newWindingMaterial,
      }) => {
        const totalUnitPrice =
          parseFloat(windingRate) + (parseFloat(priceDifference) || 0);

        const specifications =
          oldWindingMaterial !== newWindingMaterial
            ? `${oldWindingMaterial} → ${newWindingMaterial}`
            : oldWindingMaterial;

        onAddItem({
          productName: kitName,
          quantity,
          unitPrice: totalUnitPrice,
          specifications,
          category: "Rewinding Service",
          brand: "Custom",
          unit: "service",
        });
      }
    );

    setRewindingForms([{ ...initialKitState, id: crypto.randomUUID() }]);
    onSubmitted?.();
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={addNewForm}
          className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <Plus className="h-4 w-4" /> Add More Service/Item
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
