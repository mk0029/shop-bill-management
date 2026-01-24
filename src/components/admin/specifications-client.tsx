"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { useSpecificationsStore } from "@/store/specifications-store";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Database,
} from "lucide-react";
import { useRouter } from "next/navigation";

export type SpecificationsClientProps = {
  initialSpecificationOptions: Array<Record<string, any>>;
  initialCategoryFieldMappings: Array<Record<string, any>>;
};

export default function SpecificationsClient({
  initialSpecificationOptions,
  initialCategoryFieldMappings,
}: SpecificationsClientProps) {
  const router = useRouter();
  const store = useSpecificationsStore();
  const {
    specificationOptions,
    categoryFieldMappings,
    isLoading,
    error,
    getOptionsByType,
    addSpecificationOption,
    deleteSpecificationOption,
    clearError,
    setInitialData,
    forceSyncSpecifications,
  } = store as typeof store & {
    setInitialData: (data: {
      specificationOptions: any[];
      categoryFieldMappings: any[];
    }) => void;
  };

  useEffect(() => {
    setInitialData({
      specificationOptions: initialSpecificationOptions || [],
      categoryFieldMappings: initialCategoryFieldMappings || [],
    });
  }, [
    initialSpecificationOptions,
    initialCategoryFieldMappings,
    setInitialData,
  ]);

  const [selectedType, setSelectedType] = useState("amperage");
  const [newOption, setNewOption] = useState({
    type: "amperage",
    value: "",
    label: "",
    categories: [] as string[],
    sortOrder: 0,
    isActive: true,
    description: "",
  });

  const specificationTypes = [
    { value: "amperage", label: "Amperage Options" },
    { value: "voltage", label: "Voltage Options" },
    { value: "wireGauge", label: "Wire Gauge Options" },
    { value: "lightType", label: "Light Type Options" },
    { value: "color", label: "Color Options" },
    { value: "size", label: "Size Options" },
    { value: "material", label: "Material Options" },
    { value: "core", label: "Core Options" },
  ];

  const categoryOptions = [
    { value: "switch", label: "Switch" },
    { value: "socket", label: "Socket" },
    { value: "mcb", label: "MCB" },
    { value: "fuse", label: "Fuse" },
    { value: "changeover", label: "Change Over" },
    { value: "light", label: "Light" },
    { value: "bulb", label: "Bulb" },
    { value: "led", label: "LED" },
    { value: "motor", label: "Motor" },
    { value: "pump", label: "Pump" },
    { value: "geyser", label: "Geyser" },
    { value: "heater", label: "Heater" },
    { value: "mixer", label: "Mixer" },
    { value: "wire", label: "Wire" },
    { value: "cable", label: "Cable" },
    { value: "tool", label: "Tool" },
    { value: "safety", label: "Safety" },
    { value: "accessory", label: "Accessory" },
  ];

  const currentOptions = useMemo(
    () => getOptionsByType(selectedType),
    [getOptionsByType, selectedType],
  );

  const handleCategoryToggle = (categoryValue: string) => {
    setNewOption((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryValue)
        ? prev.categories.filter((c) => c !== categoryValue)
        : [...prev.categories, categoryValue],
    }));
  };

  const addNewOption = async () => {
    if (!newOption.value || !newOption.label) {
      alert("Please fill in both value and label");
      return;
    }

    try {
      await addSpecificationOption({
        type: newOption.type,
        value: newOption.value,
        label: newOption.label,
        categories: newOption.categories.map((cat: string) => ({
          _ref: cat,
          _type: "reference",
        })),
        sortOrder: newOption.sortOrder,
        isActive: newOption.isActive,
        description: newOption.description,
      });

      setNewOption({
        type: selectedType,
        value: "",
        label: "",
        categories: [],
        sortOrder: 0,
        isActive: true,
        description: "",
      });

      alert(
        `New ${selectedType} option "${newOption.label}" added successfully!`,
      );
    } catch (error) {
      console.error("Error adding option:", error);
      alert("Failed to add option. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Specifications Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => forceSyncSpecifications()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 text-red-400 flex items-center gap-2">
          <Database className="h-5 w-5" />
          {error}
          <Button variant="ghost" size="sm" onClick={() => clearError()}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Specification Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Specification Type</Label>
              <Dropdown
                options={specificationTypes}
                value={selectedType}
                onValueChange={(value) => setSelectedType(String(value))}
              />
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-gray-400">Loading options...</div>
              ) : currentOptions.length === 0 ? (
                <div className="text-gray-400">No options available</div>
              ) : (
                currentOptions.map((opt) => (
                  <div
                    key={opt._id}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-400">
                        Value: {opt.value}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSpecificationOption(opt._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Option
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={newOption.value}
                onChange={(e) =>
                  setNewOption((p) => ({ ...p, value: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={newOption.label}
                onChange={(e) =>
                  setNewOption((p) => ({ ...p, label: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={newOption.categories.includes(cat.value)}
                      onChange={() => handleCategoryToggle(cat.value)}
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={addNewOption}>
              Add Option
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle>Category Field Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryFieldMappings.length === 0 ? (
            <div className="text-gray-400">No mappings found</div>
          ) : (
            <div className="space-y-4">
              {categoryFieldMappings.map((mapping) => (
                <div
                  key={mapping._id}
                  className="rounded-lg border border-gray-800 bg-gray-950 p-3"
                >
                  <div className="font-medium">{mapping.category?.name}</div>
                  <div className="text-xs text-gray-400">
                    Type: {mapping.categoryType}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
