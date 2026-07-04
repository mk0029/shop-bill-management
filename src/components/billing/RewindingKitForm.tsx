/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { X, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/use-sanity-data";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

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

  return (
    <div style={glassCardStyle} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h4 className="text-white font-medium text-sm">Rewinding Service</h4>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(formData.id)}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: "rgba(248,113,113,0.5)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.9)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.5)"; }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`kitName-${formData.id}`} className="text-sm text-slate-300">Kit Name</Label>
            <Input
              id={`kitName-${formData.id}`}
              name="kitName"
              type="text"
              value={formData.kitName}
              onChange={handleInputChange}
              disabled={!!formData.selectedStarterId}
              placeholder="Enter kit name"
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Select Starter (Optional)</Label>
            <Dropdown
              options={starters.map((s) => ({ value: s._id, label: s.name }))}
              value={formData.selectedStarterId}
              onValueChange={(v) => handleSelectChange("selectedStarterId", v)}
              placeholder="Select starter"
              searchable
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Old Winding Material</Label>
            <Dropdown
              options={materialOptions}
              value={formData.oldWindingMaterial}
              onValueChange={(v) => handleSelectChange("oldWindingMaterial", v)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">New Winding Material</Label>
            <Dropdown
              options={materialOptions}
              value={formData.newWindingMaterial}
              onValueChange={(v) => handleSelectChange("newWindingMaterial", v)}
            />
          </div>

          {formData.oldWindingMaterial !== formData.newWindingMaterial && (
            <div className="space-y-2">
              <Label htmlFor={`priceDifference-${formData.id}`} className="text-sm text-slate-300">Price Difference</Label>
              <Input
                id={`priceDifference-${formData.id}`}
                name="priceDifference"
                type="number"
                value={formData.priceDifference}
                onChange={handleInputChange}
                placeholder="Enter difference"
                style={glassInputStyle}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`windingRate-${formData.id}`} className="text-sm text-slate-300">Winding Rate</Label>
            <Input
              id={`windingRate-${formData.id}`}
              name="windingRate"
              type="number"
              value={formData.windingRate}
              onChange={handleInputChange}
              placeholder="Enter rate"
              style={glassInputStyle}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`quantity-${formData.id}`} className="text-sm text-slate-300">Quantity</Label>
            <Input
              id={`quantity-${formData.id}`}
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              min="1"
              style={glassInputStyle}
            />
          </div>
        </div>
      </div>
    </div>
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
      toast.error("Please fill in at least one complete service.");
      return;
    }

    validForms.forEach(
      ({ kitName, windingRate, priceDifference, quantity, oldWindingMaterial, newWindingMaterial }) => {
        const totalUnitPrice = parseFloat(windingRate) + (parseFloat(priceDifference) || 0);
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
    <div className="space-y-5">
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
          variant="ghost"
          onClick={addNewForm}
          className="flex-1 gap-1.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Plus className="w-4 h-4" />
          Add More Service/Item
        </Button>
        <Button
          onClick={handleSubmitAllRewindingServices}
          className="flex-1 gap-1.5"
          style={{
            background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
            border: "1px solid rgba(56,189,248,0.25)",
          }}
        >
          Submit All Services
        </Button>
      </div>
    </div>
  );
}
