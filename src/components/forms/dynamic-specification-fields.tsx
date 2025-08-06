"use client";

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { useSpecificationsStore } from "@/store/specifications-store";

interface DynamicSpecificationFieldsProps {
  categoryId: string;
  formData: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function DynamicSpecificationFields({
  categoryId,
  formData,
  onFieldChange,
  errors = {},
  disabled = false,
}: DynamicSpecificationFieldsProps) {
  const { getCategoryFieldMapping, getOptionsByCategory } =
    useSpecificationsStore();

  // State for dynamic options
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});

  // Get field mapping for this category, memoized to prevent re-renders
  const fieldMapping = useMemo(
    () => getCategoryFieldMapping(categoryId),
    [categoryId, getCategoryFieldMapping]
  );

  // Helper function to find field definition by field key
  const findFieldDefinition = (fieldKey: string) => {
    // Check required fields first
    const requiredField = fieldMapping.requiredFields.find(
      (field) => field.fieldKey === fieldKey
    );
    if (requiredField) return requiredField;

    // Check optional fields
    const optionalField = fieldMapping.optionalFields.find(
      (field) => field.fieldKey === fieldKey
    );
    return optionalField;
  };

  // Memoize field arrays to prevent unnecessary re-renders
  const requiredFieldsKey = useMemo(
    () => fieldMapping.requiredFields.map((field) => field.fieldKey).join(","),
    [fieldMapping.requiredFields]
  );
  const optionalFieldsKey = useMemo(
    () => fieldMapping.optionalFields.map((field) => field.fieldKey).join(","),
    [fieldMapping.optionalFields]
  );

  // Load options for dropdown fields when category changes
  useEffect(() => {
    if (!categoryId) {
      setFieldOptions({});
      return;
    }

    const loadFieldOptions = () => {
      const dropdownFields = [
        "amperage",
        "voltage",
        "wireGauge",
        "core",
        "lightType",
        "color",
        "size",
        "material",
      ];

      // Get all fields from the current field mapping
      const allFields = [
        ...fieldMapping.requiredFields,
        ...fieldMapping.optionalFields,
      ];

      const fieldsToLoad = allFields.filter((field) =>
        dropdownFields.includes(field.fieldKey)
      );

      if (fieldsToLoad.length === 0) {
        setFieldOptions({});
        return;
      }

      try {
        // Load options for all dropdown fields
        const newFieldOptions = fieldsToLoad.reduce((acc, field) => {
          const options = getOptionsByCategory(categoryId, field.fieldKey);
          acc[field.fieldKey] = options;
          return acc;
        }, {} as Record<string, { value: string; label: string }[]>);

        setFieldOptions(newFieldOptions);
      } catch (error) {
        console.error("Error loading field options:", error);
        setFieldOptions({});
      }
    };

    loadFieldOptions();
  }, [
    categoryId,
    requiredFieldsKey,
    optionalFieldsKey,
    getOptionsByCategory,
    fieldMapping.requiredFields,
    fieldMapping.optionalFields,
  ]);

  // Early return if no valid category ID (after all hooks)
  if (!categoryId) {
    return null;
  }

  // Helper function to render field based on type
  const renderField = (fieldName: string, isRequired: boolean) => {
    const fieldDefinition = findFieldDefinition(fieldName);
    if (!fieldDefinition) return null;

    const fieldValue = formData[fieldName] || "";
    const hasError = errors[fieldName];

    // Determine if field should be a dropdown based on field type
    const isDropdown =
      fieldDefinition.fieldType === "select" ||
      fieldDefinition.fieldType === "multiselect";

    // Generate label with required indicator
    const label = `${fieldDefinition.fieldLabel}${isRequired ? " *" : ""}`;

    // Use placeholder from field definition or generate a default one
    const placeholder =
      fieldDefinition.placeholder ||
      `Enter ${fieldDefinition.fieldLabel.toLowerCase()}`;

    return (
      <div key={fieldDefinition._id} className="space-y-2">
        <Label htmlFor={fieldName} className="text-gray-300">
          {label}
        </Label>

        {isDropdown ? (
          <Dropdown
            options={fieldOptions[fieldName] || []}
            value={fieldValue}
            onValueChange={(value) => onFieldChange(fieldName, value)}
            placeholder={placeholder}
            disabled={disabled || fieldOptions[fieldName]?.length === 0}
            className={`bg-gray-800 border-gray-700 ${
              hasError ? "border-red-500" : ""
            }`}
          />
        ) : (
          <Input
            id={fieldName}
            type={fieldDefinition.fieldType === "number" ? "number" : "text"}
            value={fieldValue}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`bg-gray-800 border-gray-700 ${
              hasError ? "border-red-500" : ""
            }`}
          />
        )}

        {hasError && (
          <p className="text-red-400 text-sm">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  // Don't render anything if no category is selected
  if (!categoryId) {
    return null;
  }

  // Group fields by required/optional
  const requiredFields = fieldMapping.requiredFields || [];
  const optionalFields = fieldMapping.optionalFields || [];

  return (
    <div className="space-y-6">
      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {requiredFields.map((field) => renderField(field.fieldKey, true))}
        </div>
      )}

      {/* Optional Fields */}
      {optionalFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
            Optional Specifications
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {optionalFields.map((field) => renderField(field.fieldKey, false))}
          </div>
        </div>
      )}
    </div>
  );
}
