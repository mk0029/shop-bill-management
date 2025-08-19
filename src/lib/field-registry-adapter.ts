/**
 * Field Registry Adapter
 * Provides compatibility between the new dynamic field system and existing components
 */

import {
  SpecificationFieldConfig,
  CategoryFieldMapping,
} from "@/types/specification-field";
import {
  FieldDefinition,
  SanityCategoryFieldMapping,
} from "@/store/specifications-store";
import { getFieldRegistry } from "@/lib/field-registry";
import { COMMON_FIELD_KEYS } from "@/constants/specification-constants";

/**
 * Adapter class to bridge new field registry with existing system
 */
export class FieldRegistryAdapter {
  private registry = getFieldRegistry();

  /**
   * Convert new field config to legacy field definition format
   */
  toLegacyFieldDefinition(config: SpecificationFieldConfig): FieldDefinition {
    return {
      _id: config.id,
      fieldKey: config.key,
      fieldLabel: config.label,
      fieldType: config.type as any,
      description: config.description,
      placeholder: config.placeholder,
      validationRules: {
        required: config.required,
        minLength: config.validation?.minLength,
        maxLength: config.validation?.maxLength,
        minValue: config.validation?.min,
        maxValue: config.validation?.max,
        pattern: config.validation?.pattern,
        customErrorMessage: config.validation?.errorMessage,
      },
      defaultValue: undefined, // Not supported in new system yet
      sortOrder: config.displayOrder || 999,
      isActive: config.isActive,
      applicableCategories: config.categories.map((id) => ({
        _ref: id,
        _type: "reference" as const,
      })),
      conditionalLogic: config.conditional?.[0]
        ? {
            dependsOn: config.conditional[0].dependsOn,
            condition: config.conditional[0].condition,
            value: config.conditional[0].value.toString(),
          }
        : undefined,
    };
  }

  /**
   * Convert legacy field definition to new field config format
   */
  fromLegacyFieldDefinition(
    legacy: FieldDefinition,
    categoryId: string,
    isRequired: boolean = false
  ): SpecificationFieldConfig {
    return {
      id: legacy._id,
      key: legacy.fieldKey,
      label: legacy.fieldLabel,
      type: legacy.fieldType as any,
      categories: [categoryId],
      required: isRequired || legacy.validationRules?.required || false,
      validation: {
        required: isRequired || legacy.validationRules?.required,
        min: legacy.validationRules?.minValue,
        max: legacy.validationRules?.maxValue,
        minLength: legacy.validationRules?.minLength,
        maxLength: legacy.validationRules?.maxLength,
        pattern: legacy.validationRules?.pattern,
        errorMessage: legacy.validationRules?.customErrorMessage,
      },
      placeholder: legacy.placeholder,
      description: legacy.description,
      displayOrder: legacy.sortOrder,
      conditional: legacy.conditionalLogic
        ? [
            {
              dependsOn: legacy.conditionalLogic.dependsOn,
              condition: legacy.conditionalLogic.condition as any,
              value: legacy.conditionalLogic.value,
              action: "show",
            },
          ]
        : undefined,
      searchable: true,
      sortable: true,
      exportable: true,
      isActive: legacy.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Get category field mapping in legacy format
   */
  getLegacyCategoryFieldMapping(categoryId: string): CategoryFieldMapping {
    const fields = this.registry.getFieldsForCategory(categoryId);
    const requiredFields = fields.filter((f) => f.required);
    const optionalFields = fields.filter((f) => !f.required);

    return {
      categoryType: this.determineCategoryType(fields),
      requiredFields: requiredFields.map((f) =>
        this.toLegacyFieldDefinition(f)
      ),
      optionalFields: optionalFields.map((f) =>
        this.toLegacyFieldDefinition(f)
      ),
    };
  }

  /**
   * Determine category type based on fields
   */
  private determineCategoryType(
    fields: SpecificationFieldConfig[]
  ): "ampere" | "volt-watt" | "wire" | "light" | "general" {
    const fieldKeys = fields.map((f) => f.key);

    // Check for ampere category (switches, MCBs, contactors)
    if (
      fieldKeys.includes(COMMON_FIELD_KEYS.AMPERAGE) &&
      fieldKeys.includes(COMMON_FIELD_KEYS.VOLTAGE)
    ) {
      return "ampere";
    }

    // Check for volt-watt category (motors, lights, pumps)
    if (
      fieldKeys.includes(COMMON_FIELD_KEYS.WATTS) &&
      fieldKeys.includes(COMMON_FIELD_KEYS.VOLTAGE)
    ) {
      return "volt-watt";
    }

    // Check for wire category
    if (
      fieldKeys.includes(COMMON_FIELD_KEYS.WIRE_GAUGE) &&
      fieldKeys.includes(COMMON_FIELD_KEYS.CORE)
    ) {
      return "wire";
    }

    // Check for light category
    if (
      fieldKeys.includes(COMMON_FIELD_KEYS.LIGHT_TYPE) ||
      fieldKeys.includes(COMMON_FIELD_KEYS.LUMENS)
    ) {
      return "light";
    }

    return "general";
  }

  /**
   * Migrate existing form data to new field structure
   */
  migrateFormData(
    oldFormData: Record<string, any>,
    categoryId: string
  ): Record<string, any> {
    const newFormData: Record<string, any> = { ...oldFormData };
    const fields = this.registry.getFieldsForCategory(categoryId);

    // Apply field-specific migrations
    fields.forEach((field) => {
      const oldValue = oldFormData[field.key];
      if (oldValue !== undefined) {
        // Apply any necessary transformations
        newFormData[field.key] = this.transformFieldValue(field, oldValue);
      }
    });

    return newFormData;
  }

  /**
   * Transform field value based on field configuration
   */
  private transformFieldValue(
    field: SpecificationFieldConfig,
    value: any
  ): any {
    switch (field.type) {
      case "number":
        return typeof value === "string" ? parseFloat(value) || 0 : value;

      case "boolean":
        return typeof value === "string" ? value === "true" : Boolean(value);

      case "multiselect":
        return Array.isArray(value) ? value : [value].filter(Boolean);

      default:
        return value;
    }
  }

  /**
   * Get field options in legacy format
   */
  getFieldOptionsLegacy(fieldKey: string): { value: string; label: string }[] {
    const field = this.registry.getField(fieldKey);
    if (!field || !field.options) {
      return [];
    }

    return field.options.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }

  /**
   * Validate form data using new validation system
   */
  validateFormData(
    formData: Record<string, any>,
    categoryId: string
  ): { isValid: boolean; errors: Record<string, string> } {
    const fields = this.registry.getFieldsForCategory(categoryId);
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.key];
      const validationResult = this.validateFieldValue(field, value, formData);

      if (!validationResult.isValid && validationResult.errors.length > 0) {
        errors[field.key] = validationResult.errors[0];
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate individual field value
   */
  private validateFieldValue(
    field: SpecificationFieldConfig,
    value: any,
    allValues: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required field validation
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${field.label} is required`);
      return { isValid: false, errors };
    }

    // Skip further validation if field is empty and not required
    if (
      !field.required &&
      (value === undefined || value === null || value === "")
    ) {
      return { isValid: true, errors: [] };
    }

    // Type-specific validation
    switch (field.type) {
      case "number":
        if (isNaN(Number(value))) {
          errors.push(`${field.label} must be a valid number`);
        } else {
          const numValue = Number(value);
          if (
            field.validation?.min !== undefined &&
            numValue < field.validation.min
          ) {
            errors.push(
              `${field.label} must be at least ${field.validation.min}`
            );
          }
          if (
            field.validation?.max !== undefined &&
            numValue > field.validation.max
          ) {
            errors.push(`${field.label} cannot exceed ${field.validation.max}`);
          }
        }
        break;

      case "text":
      case "textarea":
        const strValue = String(value);
        if (
          field.validation?.minLength &&
          strValue.length < field.validation.minLength
        ) {
          errors.push(
            `${field.label} must be at least ${field.validation.minLength} characters`
          );
        }
        if (
          field.validation?.maxLength &&
          strValue.length > field.validation.maxLength
        ) {
          errors.push(
            `${field.label} cannot exceed ${field.validation.maxLength} characters`
          );
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(strValue)) {
            errors.push(
              field.validation.errorMessage ||
                `${field.label} format is invalid`
            );
          }
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(`${field.label} must be a valid email address`);
        }
        break;

      case "url":
        try {
          new URL(String(value));
        } catch {
          errors.push(`${field.label} must be a valid URL`);
        }
        break;

      case "select":
        if (
          field.options &&
          !field.options.some((opt) => opt.value === value)
        ) {
          errors.push(`${field.label} must be one of the available options`);
        }
        break;

      case "multiselect":
        if (Array.isArray(value) && field.options) {
          const validValues = field.options.map((opt) => opt.value);
          const invalidValues = value.filter((v) => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors.push(
              `${field.label} contains invalid options: ${invalidValues.join(", ")}`
            );
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get field configuration for existing dynamic specification components
   */
  getFieldConfigForDynamicComponent(categoryId: string): {
    requiredFields: FieldDefinition[];
    optionalFields: FieldDefinition[];
  } {
    const mapping = this.getLegacyCategoryFieldMapping(categoryId);
    return {
      requiredFields: mapping.requiredFields,
      optionalFields: mapping.optionalFields,
    };
  }
}

// Singleton instance
let adapterInstance: FieldRegistryAdapter | null = null;

/**
 * Get the singleton adapter instance
 */
export const getFieldRegistryAdapter = (): FieldRegistryAdapter => {
  if (!adapterInstance) {
    adapterInstance = new FieldRegistryAdapter();
  }
  return adapterInstance;
};

/**
 * React hook for using the field registry adapter
 */
export const useFieldRegistryAdapter = () => {
  const adapter = getFieldRegistryAdapter();

  return {
    adapter,
    getLegacyCategoryFieldMapping: (categoryId: string) =>
      adapter.getLegacyCategoryFieldMapping(categoryId),
    validateFormData: (formData: Record<string, any>, categoryId: string) =>
      adapter.validateFormData(formData, categoryId),
    migrateFormData: (formData: Record<string, any>, categoryId: string) =>
      adapter.migrateFormData(formData, categoryId),
    getFieldOptions: (fieldKey: string) =>
      adapter.getFieldOptionsLegacy(fieldKey),
    getFieldConfigForDynamicComponent: (categoryId: string) =>
      adapter.getFieldConfigForDynamicComponent(categoryId),
  };
};
