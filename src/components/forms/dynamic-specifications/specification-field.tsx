import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownOption } from "@/types";

interface SpecificationFieldProps {
  fieldDefinition: any;
  fieldName: string;
  fieldValue: string;
  fieldOptions: DropdownOption[];
  isRequired: boolean;
  hasError: boolean;
  errorMessage?: string;
  disabled?: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function SpecificationField({
  fieldDefinition,
  fieldName,
  fieldValue,
  fieldOptions,
  isRequired,
  hasError,
  errorMessage,
  disabled = false,
  onFieldChange,
}: SpecificationFieldProps) {
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

  const fieldClassName = `bg-gray-800 border-gray-700 ${
    hasError ? "border-red-500" : ""
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName} className="text-gray-300">
        {label}
      </Label>

      {isDropdown ? (
        <Dropdown
          options={fieldOptions}
          value={fieldValue}
          onValueChange={(value) => onFieldChange(fieldName, value)}
          placeholder={placeholder}
          disabled={disabled || fieldOptions.length === 0}
          className={fieldClassName}
        />
      ) : (
        <Input
          id={fieldName}
          type={fieldDefinition.fieldType === "number" ? "number" : "text"}
          value={fieldValue}
          onChange={(e) => onFieldChange(fieldName, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={fieldClassName}
        />
      )}

      {hasError && errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
    </div>
  );
}

export default SpecificationField;
