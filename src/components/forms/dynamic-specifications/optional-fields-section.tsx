import React from "react";
import { SpecificationField } from "./specification-field";
import { DropdownOption } from "@/types";

interface OptionalFieldsSectionProps {
  optionalFields: any[];
  fieldOptions: Record<string, DropdownOption[]>;
  formData: Record<string, string>;
  errors: Record<string, string>;
  disabled: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function OptionalFieldsSection({
  optionalFields,
  fieldOptions,
  formData,
  errors,
  disabled,
  onFieldChange,
}: OptionalFieldsSectionProps) {
  if (optionalFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
        Optional Specifications
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {optionalFields.map((field) => (
          <SpecificationField
            key={field._id}
            fieldDefinition={field}
            fieldName={field.fieldKey}
            fieldValue={formData[field.fieldKey] || ""}
            fieldOptions={fieldOptions[field.fieldKey] || []}
            isRequired={false}
            hasError={!!errors[field.fieldKey]}
            errorMessage={errors[field.fieldKey]}
            disabled={disabled}
            onFieldChange={onFieldChange}
          />
        ))}
      </div>
    </div>
  );
}

export default OptionalFieldsSection;
