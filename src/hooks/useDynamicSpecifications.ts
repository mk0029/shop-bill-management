import { useState, useEffect, useMemo, useCallback } from "react";
import { useSpecificationsStore } from "@/store/specifications-store";
import { DropdownOption } from "@/types";

interface UseDynamicSpecificationsProps {
  categoryId: string;
  formData: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
}

export function useDynamicSpecifications({
  categoryId,
  formData,
  onFieldChange,
}: UseDynamicSpecificationsProps) {
  const { getCategoryFieldMapping, getOptionsByCategory } =
    useSpecificationsStore();

  const [fieldOptions, setFieldOptions] = useState<
    Record<string, DropdownOption[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  // Get field mapping for this category, memoized to prevent re-renders
  const fieldMapping = useMemo(
    () => getCategoryFieldMapping(categoryId),
    [categoryId, getCategoryFieldMapping]
  );

  // Helper function to find field definition by field key
  const findFieldDefinition = useCallback(
    (fieldKey: string) => {
      const requiredField = fieldMapping.requiredFields.find(
        (field) => field.fieldKey === fieldKey
      );
      if (requiredField) return requiredField;

      const optionalField = fieldMapping.optionalFields.find(
        (field) => field.fieldKey === fieldKey
      );
      return optionalField;
    },
    [fieldMapping]
  );

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

    const loadFieldOptions = async () => {
      setIsLoading(true);
      try {
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

        const newFieldOptions = fieldsToLoad.reduce((acc, field) => {
          const options = getOptionsByCategory(categoryId, field.fieldKey);
          acc[field.fieldKey] = options;
          return acc;
        }, {} as Record<string, DropdownOption[]>);

        setFieldOptions(newFieldOptions);
      } catch (error) {
        console.error("Error loading field options:", error);
        setFieldOptions({});
      } finally {
        setIsLoading(false);
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

  return {
    fieldMapping,
    fieldOptions,
    isLoading,
    findFieldDefinition,
    onFieldChange,
    formData,
  };
}
