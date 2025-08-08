"use client";

import React from "react";
import { useDynamicSpecifications } from "@/hooks/useDynamicSpecifications";
import { RequiredFieldsSection } from "./dynamic-specifications/required-fields-section";
import { OptionalFieldsSection } from "./dynamic-specifications/optional-fields-section";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  const { fieldMapping, fieldOptions, isLoading } = useDynamicSpecifications({
    categoryId,
    formData,
    onFieldChange,
  });

  // Early return if no valid category ID
  if (!categoryId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner text="Loading specification fields..." />
      </div>
    );
  }

  const requiredFields = fieldMapping.requiredFields || [];
  const optionalFields = fieldMapping.optionalFields || [];

  return (
    <div className="space-y-6">
      {/* Required Fields */}
      <RequiredFieldsSection
        requiredFields={requiredFields}
        fieldOptions={fieldOptions}
        formData={formData}
        errors={errors}
        disabled={disabled}
        onFieldChange={onFieldChange}
      />

      {/* Optional Fields */}
      <OptionalFieldsSection
        optionalFields={optionalFields}
        fieldOptions={fieldOptions}
        formData={formData}
        errors={errors}
        disabled={disabled}
        onFieldChange={onFieldChange}
      />
    </div>
  );
}
