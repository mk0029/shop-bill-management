"use client";

import { useState, useEffect } from "react";
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

export default function SpecificationsManagementPage() {
  const router = useRouter();
  const {
    specificationOptions,
    categoryFieldMappings,
    isLoading,
    error,
    fetchSpecificationOptions,
    fetchCategoryFieldMappings,
    refreshData,
    getOptionsByType,
    addSpecificationOption,
    deleteSpecificationOption,
    clearError,
  } = useSpecificationsStore();

  // Initialize data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  const getCurrentOptions = () => {
    return getOptionsByType(selectedType);
  };

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
        categories: newOption.categories,
        sortOrder: newOption.sortOrder,
        isActive: newOption.isActive,
        description: newOption.description,
      });

      // Reset form
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
        `New ${selectedType} option "${newOption.label}" added successfully!`
      );
    } catch (error) {
      console.error("Error adding option:", error);
      alert("Failed to add option. Please try again.");
    }
  };

  const handleDeleteOption = async (optionId: string, optionLabel: string) => {
    if (confirm(`Are you sure you want to delete "${optionLabel}"?`)) {
      try {
        await deleteSpecificationOption(optionId);
        alert(`"${optionLabel}" deleted successfully!`);
      } catch (error) {
        console.error("Error deleting option:", error);
        alert("Failed to delete option. Please try again.");
      }
    }
  };

  // Update new option type when selected type changes
  useEffect(() => {
    setNewOption((prev) => ({ ...prev, type: selectedType }));
  }, [selectedType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Specifications Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage specification options from Sanity CMS across all devices
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900 border-red-800">
          <CardContent className="sm:p-4 p-3">
            <div className="flex justify-between items-center">
              <p className="text-red-200">{error}</p>
              <Button
                variant="ghost"
                onClick={clearError}
                className="text-red-200"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="sm:p-4 p-3 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-gray-300">
              Loading specification data from Sanity...
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Options */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Current Options from Sanity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label className="text-gray-300">Specification Type</Label>
              <Dropdown
                options={specificationTypes}
                value={selectedType}
                onValueChange={setSelectedType}
                placeholder="Select specification type"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Options List */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Current{" "}
                {
                  specificationTypes.find((t) => t.value === selectedType)
                    ?.label
                }{" "}
                ({getCurrentOptions().length} items)
              </Label>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {getCurrentOptions().length === 0 ? (
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                    <p className="text-gray-400">
                      No options found for this type.
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Add some options using the form on the right.
                    </p>
                  </div>
                ) : (
                  getCurrentOptions().map((option) => (
                    <div
                      key={option._id}
                      className="bg-gray-800 p-3 rounded-lg border border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {option.label}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Value: {option.value}
                          </p>
                          {option.categories &&
                            option.categories.length > 0 && (
                              <p className="text-gray-400 text-sm">
                                Categories: {option.categories.join(", ")}
                              </p>
                            )}
                          {option.description && (
                            <p className="text-gray-500 text-xs mt-1">
                              {option.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() =>
                            handleDeleteOption(option._id, option.label)
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add New Option */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Option to Sanity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">Specification Type *</Label>
              <Dropdown
                options={specificationTypes}
                value={newOption.type}
                onValueChange={(value) =>
                  setNewOption((prev) => ({ ...prev, type: value }))
                }
                placeholder="Select specification type"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label className="text-gray-300">Value *</Label>
              <Input
                value={newOption.value}
                onChange={(e) =>
                  setNewOption((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder="e.g., 35A, 12V, 2.5mm"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-gray-500 text-xs">
                The internal value used in the system
              </p>
            </div>

            {/* Label Input */}
            <div className="space-y-2">
              <Label className="text-gray-300">Display Label *</Label>
              <Input
                value={newOption.label}
                onChange={(e) =>
                  setNewOption((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., 35A, 12V, 2.5 sq mm"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-gray-500 text-xs">
                The label shown to users in dropdowns
              </p>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label className="text-gray-300">Sort Order</Label>
              <Input
                type="number"
                value={newOption.sortOrder}
                onChange={(e) =>
                  setNewOption((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-gray-500 text-xs">
                Lower numbers appear first in dropdowns
              </p>
            </div>

            {/* Categories Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">Applicable Categories</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {categoryOptions.map((category) => (
                  <label
                    key={category.value}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      checked={newOption.categories.includes(category.value)}
                      onChange={() => handleCategoryToggle(category.value)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-600"
                    />
                    <span className="text-gray-300 text-sm">
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-gray-500 text-xs">
                Select which product categories can use this option
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <textarea
                value={newOption.description}
                onChange={(e) =>
                  setNewOption((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description for this specification option"
                className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none  "
              />
            </div>

            {/* Add Button */}
            <Button
              onClick={addNewOption}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!newOption.value || !newOption.label || isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Sanity CMS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            How Sanity-Based Specifications Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-white mb-2">
                🎯 Multi-Device Sync
              </h4>
              <p className="text-sm">
                All specification options are stored in Sanity CMS and
                automatically sync across all devices and instances of your
                application.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">
                ⚡ Real-time Updates
              </h4>
              <p className="text-sm">
                When you add or modify options here, they're immediately
                available in the inventory add form and across all admin
                interfaces.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">
                🔧 Category Filtering
              </h4>
              <p className="text-sm">
                Options are automatically filtered based on the selected product
                category. Only relevant specifications appear for each category
                type.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">
                📝 Easy Management
              </h4>
              <p className="text-sm">
                Add new amperage values, voltage options, wire gauges, and more
                without touching code. Changes are instant and persistent.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-200 mb-2">💡 Quick Example</h4>
            <p className="text-sm text-blue-100">
              To add a new amperage option like "35A" for switches and sockets:
              <br />
              1. Select "Amperage Options" above
              <br />
              2. Enter Value: "35A" and Label: "35A"
              <br />
              3. Check "Switch" and "Socket" categories
              <br />
              4. Click "Add to Sanity CMS&quot;
              <br />
              5. The option will immediately appear in inventory forms!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
