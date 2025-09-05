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
  const { fieldMapping, isLoading } = useDynamicSpecifications({
    categoryId,
    formData,
    onFieldChange,
  });

  // Force refresh specifications store on mount
  React.useEffect(() => {
    console.log('DynamicSpecificationFields: Effect triggered with categoryId:', categoryId);
    if (categoryId) {
      console.log('DynamicSpecificationFields: Forcing specifications store refresh');
      const { forceSyncSpecifications } = require('@/store/specifications-store').useSpecificationsStore.getState();
      forceSyncSpecifications().then(() => {
        console.log('DynamicSpecificationFields: Force sync completed');
      });
    }
  }, [categoryId]);



  // Early return if no valid category ID
  if (!categoryId) {
    return (
      <div className="text-gray-400 text-sm">
        Select a category to see specification fields
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner text="Loading specification fields..." />
      </div>
    );
  }

  // Debug logging
  console.log('=== DynamicSpecificationFields Debug ===');
  console.log('categoryId:', categoryId);
  console.log('fieldMapping:', fieldMapping);

  // Debug: Check if we have dynamic field mapping data
  if (fieldMapping) {
    console.log('✅ Found dynamic field mapping for category:', categoryId);
    console.log('Required fields:', fieldMapping.requiredFields);
    console.log('Optional fields:', fieldMapping.optionalFields);
  } else {
    console.log('❌ No field mapping found for category:', categoryId);
    const { useSpecificationsStore } = require('@/store/specifications-store');
    const allMappings = useSpecificationsStore.getState().categoryFieldMappings;
    console.log('📋 Available mappings in store:', allMappings);
    
    // Show what each mapping looks like
    allMappings?.forEach((mapping, index) => {
      console.log(`Mapping ${index + 1}:`, {
        id: mapping._id,
        categoryType: mapping.categoryType,
        categoryId: mapping.category?._id,
        categoryName: mapping.category?.name,
        isActive: mapping.isActive,
        requiredFieldsCount: mapping.requiredFields?.length || 0,
        optionalFieldsCount: mapping.optionalFields?.length || 0
      });
    });
  }


  // Show message if no fields are configured
  if (!fieldMapping || (!fieldMapping.requiredFields?.length && !fieldMapping.optionalFields?.length)) {
    return null;
    // <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    //   <p className="text-gray-400 text-sm">
    //     No specification fields configured for this category.
    //     <br />
    //     Check Sanity CMS field mappings for category ID: {categoryId}
    //     <br />
    //     Field mapping: {JSON.stringify(fieldMapping)}
    //   </p>
    // </div>
  }

  return (
    <div className="border-t border-gray-700 pt-4 mt-4">
    <h3 className="text-lg font-medium text-white mb-4">
      Specifications
    </h3>
    <div className="space-y-6 max-md:space-y-4">
      {/* Required Fields */}
      {fieldMapping.requiredFields?.length > 0 && (
        <RequiredFieldsSection
          requiredFields={fieldMapping.requiredFields}
          formData={formData}
          errors={errors}
          disabled={disabled || isLoading}
          onFieldChange={onFieldChange}
        />
      )}

      {/* Optional Fields */}
      {fieldMapping.optionalFields?.length > 0 && (
        <OptionalFieldsSection
          optionalFields={fieldMapping.optionalFields}
          formData={formData}
          errors={errors}
          disabled={disabled || isLoading}
          onFieldChange={onFieldChange}
        />
      )}
    </div></div>
  );
}
