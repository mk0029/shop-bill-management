import React from "react";
import { SpecificationField } from "./specification-field";
import { DropdownOption } from "@/types";

interface RequiredFieldsSectionProps {
  requiredFields: any[];
  fieldOptions: Record<string, DropdownOption[]>;
  formData: Record<string, string>;
  errors: Record<string, string>;
  disabled: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function RequiredFieldsSection({
  requiredFields,
  fieldOptions,
  formData,
  errors,
  disabled,
  onFieldChange,
}: RequiredFieldsSectionProps) {
  if (requiredFields.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {requiredFields.map((field) => (
        <SpecificationField
          key={field._id}
          fieldDefinition={field}
          fieldName={field.fieldKey}
          fieldValue={formData[field.fieldKey] || ""}
          fieldOptions={fieldOptions[field.fieldKey] || []}
          isRequired={true}
          hasError={!!errors[field.fieldKey]}
          errorMessage={errors[field.fieldKey]}
          disabled={disabled}
          onFieldChange={onFieldChange}
        />
      ))}
    </div>
  );
}

export default RequiredFieldsSection;
