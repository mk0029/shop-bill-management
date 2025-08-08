"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useCategoryStore } from "@/store/category-store";
import { validateProduct } from "@/lib/dynamic-validation";
import { ArrowLeft, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TestDynamicSpecsPage() {
  const router = useRouter();
  const {
    specificationOptions,
    categoryFieldMappings,
    isLoading,
    error,
    refreshData,
    getOptionsByCategory,
    getCategoryFieldMapping,
    clearError,
  } = useSpecificationsStore();

  const { categories, fetchCategories, getActiveCategories } =
    useCategoryStore();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [testResults, setTestResults] = useState<string[]>([]);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
      await refreshData();
    };
    initializeData();
  }, [fetchCategories, refreshData]);

  // Get dropdown options from stores
  const itemCategories = getActiveCategories().map((cat) => ({
    value: cat.name.toLowerCase(),
    label: cat.name,
  }));

  // Get field mapping for selected category
  const fieldMapping = selectedCategory
    ? getCategoryFieldMapping(selectedCategory)
    : null;

  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setFormData({ category: categoryName });
    setValidationErrors({});
    setTestResults([]);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const runValidationTest = async () => {
    setTestResults([]);

    try {
      const errors = await validateProduct(formData);

      if (Object.keys(errors).length === 0) {
        setTestResults([
          "✅ Validation passed! All required fields are filled correctly.",
        ]);
        setValidationErrors({});
      } else {
        setValidationErrors(errors);
        setTestResults([
          "❌ Validation failed with the following errors:",
          ...Object.entries(errors).map(
            ([field, error]) => `  • ${field}: ${error}`
          ),
        ]);
      }
    } catch (error) {
      setTestResults([`❌ Validation test failed: ${error}`]);
    }
  };

  const renderDynamicField = (fieldName: string, isRequired: boolean) => {
    const fieldValue = formData[fieldName] || "";
    const hasError = validationErrors[fieldName];
    const options = getOptionsByCategory(selectedCategory, fieldName);

    const fieldLabels: Record<string, string> = {
      amperage: "Amperage",
      voltage: "Voltage",
      wattage: "Wattage (W)",
      wireGauge: "Wire Gauge",
      core: "Core Type",
      lightType: "Light Type",
      color: "Color",
      size: "Size",
      material: "Material",
    };

    const label = fieldLabels[fieldName] || fieldName;

    // For wattage, use input field
    if (fieldName === "wattage") {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-gray-300">
            {label}
            {isRequired ? " *" : ""}
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0.5"
            max="2000"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder="Enter wattage (e.g., 5, 12, 20, 100)"
            className={`bg-gray-800 border-gray-700 text-white ${
              hasError ? "border-red-500" : ""
            }`}
          />
          {hasError && <p className="text-red-400 text-sm">{hasError}</p>}
        </div>
      );
    }

    // For other fields, use dropdown if options are available
    if (options.length > 0) {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-gray-300">
            {label}
            {isRequired ? " *" : ""}
          </Label>
          <Dropdown
            options={options}
            value={fieldValue}
            onValueChange={(value) => handleFieldChange(fieldName, value)}
            placeholder={`Select ${label.toLowerCase()}`}
            className={`bg-gray-800 border-gray-700 ${
              hasError ? "border-red-500" : ""
            }`}
          />
          {hasError && <p className="text-red-400 text-sm">{hasError}</p>}
        </div>
      );
    }

    // Fallback to text input
    return (
      <div key={fieldName} className="space-y-2">
        <Label className="text-gray-300">
          {label}
          {isRequired ? " *" : ""}
        </Label>
        <Input
          value={fieldValue}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          className={`bg-gray-800 border-gray-700 text-white ${
            hasError ? "border-red-500" : ""
          }`}
        />
        {hasError && <p className="text-red-400 text-sm">{hasError}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Dynamic Specifications Test
          </h1>
          <p className="text-gray-400 mt-1">
            Test the dynamic specification system with category-based field
            mapping
          </p>
        </div>
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
                className="text-red-200">
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
            <p className="text-gray-300">Loading specification data...</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Form */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Dynamic Form Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">Category *</Label>
              <Dropdown
                options={itemCategories}
                value={selectedCategory}
                onValueChange={handleCategoryChange}
                placeholder="Select category to test"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Dynamic Fields Based on Category */}
            {fieldMapping && (
              <>
                {/* Required Fields */}
                {fieldMapping.requiredFields.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-300 border-b border-gray-700 pb-2">
                      Required Fields
                    </h4>
                    <div className="space-y-4">
                      {fieldMapping.requiredFields.map((field) =>
                        renderDynamicField(field, true)
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Fields */}
                {fieldMapping.optionalFields.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                      Optional Fields
                    </h4>
                    <div className="space-y-4">
                      {fieldMapping.optionalFields.map((field) =>
                        renderDynamicField(field, false)
                      )}
                    </div>
                  </div>
                )}

                {/* Test Button */}
                <Button
                  onClick={runValidationTest}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedCategory}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Run Validation Test
                </Button>
              </>
            )}

            {!selectedCategory && (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  Select a category to see dynamic fields
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Test Results & Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Validation Results */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">
                  Validation Results:
                </h4>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {testResults.map((result, index) => (
                    <p
                      key={index}
                      className={`text-sm ${
                        result.startsWith("✅")
                          ? "text-green-400"
                          : result.startsWith("❌")
                          ? "text-red-400"
                          : "text-gray-300"
                      }`}>
                      {result}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Current Form Data */}
            {Object.keys(formData).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">
                  Current Form Data:
                </h4>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Field Mapping Info */}
            {fieldMapping && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">
                  Category Field Mapping:
                </h4>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Type:</span>{" "}
                    {fieldMapping.categoryType}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Required:</span>{" "}
                    {fieldMapping.requiredFields.join(", ") || "None"}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Optional:</span>{" "}
                    {fieldMapping.optionalFields.join(", ") || "None"}
                  </p>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-300">System Status:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {specificationOptions.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    Specification Options: {specificationOptions.length} loaded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {categoryFieldMappings.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    Category Mappings: {categoryFieldMappings.length} loaded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {categories.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    Categories: {categories.length} loaded
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
