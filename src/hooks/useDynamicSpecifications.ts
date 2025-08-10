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
  const { getCategoryFieldMapping } = useSpecificationsStore();
  const [isLoading, setIsLoading] = useState(false); // Kept for potential future async operations

  // Get field mapping for this category, memoized to prevent re-renders
  const fieldMapping = useMemo(() => {
    if (!categoryId) {
      return { requiredFields: [], optionalFields: [] };
    }
    setIsLoading(true);
    const mapping = getCategoryFieldMapping(categoryId);
    setIsLoading(false);
    return mapping;
  }, [categoryId, getCategoryFieldMapping]);

  return {
    fieldMapping,
    isLoading,
  };
}
