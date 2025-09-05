/**
 * React Hook for Dynamic Field Registry
 * Provides React integration for the field registry system
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  SpecificationFieldConfig,
  RegistrySubscriber,
  RegistryEvent,
  FieldValidationResult,
} from "@/types/specification-field";
import {
  getFieldRegistry,
  initializeFieldRegistry,
} from "@/lib/field-registry";
import { getFieldRegistryAdapter } from "@/lib/field-registry-adapter";
import { FieldDefinition } from "@/store/specifications-store";

interface UseDynamicFieldRegistryOptions {
  categoryId?: string;
  autoInitialize?: boolean;
  enableRealTimeUpdates?: boolean;
}

interface UseDynamicFieldRegistryReturn {
  // Registry state
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  // Field operations
  getField: (key: string) => SpecificationFieldConfig | undefined;
  getFieldsForCategory: (categoryId: string) => SpecificationFieldConfig[];
  getRequiredFields: (categoryId: string) => SpecificationFieldConfig[];
  getAllFields: () => SpecificationFieldConfig[];

  // Legacy compatibility
  getLegacyFieldMapping: (categoryId: string) => {
    requiredFields: FieldDefinition[];
    optionalFields: FieldDefinition[];
  };

  // Validation
  validateField: (
    fieldKey: string,
    value: any,
    allValues?: Record<string, any>
  ) => FieldValidationResult;
  validateForm: (
    formData: Record<string, any>,
    categoryId: string
  ) => {
    isValid: boolean;
    errors: Record<string, string>;
  };

  // Form data migration
  migrateFormData: (
    formData: Record<string, any>,
    categoryId: string
  ) => Record<string, any>;

  // Registry management
  refreshRegistry: () => Promise<void>;
  subscribe: (callback: (event: RegistryEvent) => void) => () => void;
}

/**
 * Hook for using the dynamic field registry
 */
export const useDynamicFieldRegistry = (
  options: UseDynamicFieldRegistryOptions = {}
): UseDynamicFieldRegistryReturn => {
  const {
    categoryId,
    autoInitialize = true,
    enableRealTimeUpdates = true,
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const registry = useMemo(() => getFieldRegistry(), []);
  const adapter = useMemo(() => getFieldRegistryAdapter(), []);

  const initializeRegistry = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await initializeFieldRegistry();
      setIsReady(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize field registry"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize registry
  useEffect(() => {
    if (autoInitialize && !isReady && !isLoading) {
      initializeRegistry();
    }
  }, [autoInitialize, isReady, isLoading, initializeRegistry]);

  // Subscribe to registry changes
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const subscriber: RegistrySubscriber = {
      id: `hook_${Date.now()}_${Math.random()}`,
      onFieldChange: (event: RegistryEvent) => {
        // Trigger re-render when fields change
        setUpdateTrigger((prev) => prev + 1);
      },
    };

    registry.subscribe(subscriber);

    return () => {
      registry.unsubscribe(subscriber);
    };
  }, [registry, enableRealTimeUpdates]); // Removed updateTrigger from dependencies

  const refreshRegistry = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await registry.loadFields();
      setUpdateTrigger((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh field registry"
      );
    } finally {
      setIsLoading(false);
    }
  }, [registry]);

  const getField = useCallback(
    (key: string) => {
      return registry.getField(key);
    },
    [registry, updateTrigger]
  );

  const getFieldsForCategory = useCallback(
    (categoryId: string) => {
      return registry.getFieldsForCategory(categoryId);
    },
    [registry, updateTrigger]
  );

  const getRequiredFields = useCallback(
    (categoryId: string) => {
      return registry.getRequiredFields(categoryId);
    },
    [registry, updateTrigger]
  );

  const getAllFields = useCallback(() => {
    return registry.getAllFields();
  }, [registry, updateTrigger]);

  const getLegacyFieldMapping = useCallback(
    (categoryId: string) => {
      return adapter.getFieldConfigForDynamicComponent(categoryId);
    },
    [adapter, updateTrigger]
  );

  const validateField = useCallback(
    (
      fieldKey: string,
      value: any,
      allValues: Record<string, any> = {}
    ): FieldValidationResult => {
      const field = registry.getField(fieldKey);
      if (!field) {
        return {
          isValid: false,
          errors: [`Field '${fieldKey}' not found`],
          warnings: [],
        };
      }

      // Use adapter for validation
      const result = adapter["validateFieldValue"](field, value, allValues);
      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: [],
        value: value,
      };
    },
    [registry, adapter, updateTrigger]
  );

  const validateForm = useCallback(
    (formData: Record<string, any>, categoryId: string) => {
      return adapter.validateFormData(formData, categoryId);
    },
    [adapter, updateTrigger]
  );

  const migrateFormData = useCallback(
    (formData: Record<string, any>, categoryId: string) => {
      return adapter.migrateFormData(formData, categoryId);
    },
    [adapter]
  );

  const subscribe = useCallback(
    (callback: (event: RegistryEvent) => void) => {
      const subscriber: RegistrySubscriber = {
        id: `callback_${Date.now()}_${Math.random()}`,
        onFieldChange: callback,
      };

      registry.subscribe(subscriber);

      return () => {
        registry.unsubscribe(subscriber);
      };
    },
    [registry]
  );

  return {
    isReady,
    isLoading,
    error,
    getField,
    getFieldsForCategory,
    getRequiredFields,
    getAllFields,
    getLegacyFieldMapping,
    validateField,
    validateForm,
    migrateFormData,
    refreshRegistry,
    subscribe,
  };
};

/**
 * Hook specifically for category-based field operations
 */
export const useCategoryFields = (categoryId: string) => {
  const {
    isReady,
    isLoading,
    error,
    getFieldsForCategory,
    getRequiredFields,
    getLegacyFieldMapping,
    validateForm,
    migrateFormData,
  } = useDynamicFieldRegistry({ categoryId });

  const fields = useMemo(() => {
    if (!isReady || !categoryId) return [];
    return getFieldsForCategory(categoryId);
  }, [isReady, categoryId, getFieldsForCategory]);

  const requiredFields = useMemo(() => {
    if (!isReady || !categoryId) return [];
    return getRequiredFields(categoryId);
  }, [isReady, categoryId, getRequiredFields]);

  const legacyMapping = useMemo(() => {
    if (!isReady || !categoryId)
      return { requiredFields: [], optionalFields: [] };
    return getLegacyFieldMapping(categoryId);
  }, [isReady, categoryId, getLegacyFieldMapping]);

  const validateCategoryForm = useCallback(
    (formData: Record<string, any>) => {
      if (!categoryId) return { isValid: true, errors: {} };
      return validateForm(formData, categoryId);
    },
    [categoryId, validateForm]
  );

  const migrateCategoryFormData = useCallback(
    (formData: Record<string, any>) => {
      if (!categoryId) return formData;
      return migrateFormData(formData, categoryId);
    },
    [categoryId, migrateFormData]
  );

  return {
    isReady,
    isLoading,
    error,
    fields,
    requiredFields,
    legacyMapping,
    validateForm: validateCategoryForm,
    migrateFormData: migrateCategoryFormData,
  };
};

/**
 * Hook for field validation
 */
export const useFieldValidation = (categoryId?: string) => {
  const { validateField, validateForm } = useDynamicFieldRegistry({
    categoryId,
  });

  const validateSingleField = useCallback(
    (fieldKey: string, value: any, allValues: Record<string, any> = {}) => {
      return validateField(fieldKey, value, allValues);
    },
    [validateField]
  );

  const validateFormData = useCallback(
    (formData: Record<string, any>, targetCategoryId?: string) => {
      const categoryToUse = targetCategoryId || categoryId;
      if (!categoryToUse) {
        return { isValid: true, errors: {} };
      }
      return validateForm(formData, categoryToUse);
    },
    [validateForm, categoryId]
  );

  return {
    validateField: validateSingleField,
    validateForm: validateFormData,
  };
};
