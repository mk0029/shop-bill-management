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
}: UseDynamicSpecificationsProps) {
  const { getCategoryFieldMapping, fetchCategoryFieldMappings } = useSpecificationsStore();
  const [isLoading, setIsLoading] = useState(false);

  // Force refresh data when component mounts or categoryId changes
  useEffect(() => {
    if (categoryId) {
      console.log('useDynamicSpecifications: Force refreshing for categoryId:', categoryId);
      setIsLoading(true);
      fetchCategoryFieldMappings().finally(() => setIsLoading(false));
    }
  }, [categoryId, fetchCategoryFieldMappings]);

  // Get field mapping for this category, memoized to prevent re-renders
  const fieldMapping = useMemo(() => {
    if (!categoryId) {
      console.log('useDynamicSpecifications: No categoryId provided');
      return { requiredFields: [], optionalFields: [] };
    }

    try {
      console.log('useDynamicSpecifications: Getting field mapping for categoryId:', categoryId);
      const mapping = getCategoryFieldMapping(categoryId);
      console.log('useDynamicSpecifications: Field mapping result:', mapping);
      console.log('useDynamicSpecifications: Required fields:', mapping.requiredFields);
      console.log('useDynamicSpecifications: Optional fields:', mapping.optionalFields);
      return mapping;
    } catch (error) {
      console.error("Error getting field mapping:", error);
      return { requiredFields: [], optionalFields: [] };
    }
  }, [categoryId, getCategoryFieldMapping]);

  return {
    fieldMapping,
    isLoading,
  };
}
