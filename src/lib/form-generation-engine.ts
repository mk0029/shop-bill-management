/**
 * Dynamic Form Generation Engine
 * Generates forms based on category field configurations
 */

import React from "react";
import {
  SpecificationFieldConfig,
  FormSchema,
  FieldGroup,
  CategoryFieldMapping,
  FormValidationResult,
} from "@/types/specification-field";

import { FormGenerationError } from "@/lib/specification-errors";
import { getValidationEngine } from "@/lib/validation-engine";
import { getFieldDataAccess } from "@/lib/field-data-access";

/**
 * Form generation options
 */
export interface FormGenerationOptions {
  categoryId: string;
  includeOptionalFields?: boolean;
  groupFields?: boolean;
  enableConditionalLogic?: boolean;
  customFieldOrder?: string[];
  excludeFields?: string[];
  fieldOverrides?: Record<string, Partial<SpecificationFieldConfig>>;
}

/**
 * Generated form structure
 */
export interface GeneratedForm {
  schema: FormSchema;
  fields: SpecificationFieldConfig[];
  groups: FieldGroup[];
  requiredFields: string[];
  optionalFields: string[];
  conditionalRules: Record<string, any>;
  validationRules: Record<string, any>;
}

/**
 * Form state management
 */
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Dynamic Form Generation Engine
 */
export class DynamicFormGenerator {
  private dataAccess = getFieldDataAccess();
  private validationEngine = getValidationEngine();
  private formCache = new Map<string, GeneratedForm>();

  /**
   * Generate form schema for a category
   */
  async generateFormSchema(
    options: FormGenerationOptions
  ): Promise<FormSchema> {
    try {
      const { categoryId } = options;

      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.formCache.get(cacheKey);
      if (cached) {
        return cached.schema;
      }

      // Fetch field configurations for the category
      const fields = await this.dataAccess.fetchFieldsForCategory(categoryId);
      const fieldGroups = await this.dataAccess.fetchFieldGroups();

      // Apply options and filters
      const processedFields = this.processFields(fields, options);
      const processedGroups = this.processGroups(fieldGroups, processedFields);

      // Generate validation rules
      const validationRules = this.generateValidationRules(processedFields);

      // Generate conditional rules
      const conditionalRules = this.generateConditionalRules(processedFields);

      const schema: FormSchema = {
        categoryId,
        fields: processedFields,
        groups: processedGroups,
        validationRules,
        conditionalRules,
      };

      // Cache the result
      const generatedForm: GeneratedForm = {
        schema,
        fields: processedFields,
        groups: processedGroups,
        requiredFields: processedFields
          .filter((f) => f.required)
          .map((f) => f.key),
        optionalFields: processedFields
          .filter((f) => !f.required)
          .map((f) => f.key),
        conditionalRules,
        validationRules,
      };

      this.formCache.set(cacheKey, generatedForm);

      return schema;
    } catch (error) {
      throw FormGenerationError.schemaGenerationFailed(
        options.categoryId,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Generate complete form structure
   */
  async generateForm(options: FormGenerationOptions): Promise<GeneratedForm> {
    const schema = await this.generateFormSchema(options);
    const cacheKey = this.generateCacheKey(options);
    return this.formCache.get(cacheKey)!;
  }

  /**
   * Create initial form state
   */
  createInitialFormState(
    fields: SpecificationFieldConfig[],
    initialValues: Record<string, any> = {}
  ): FormState {
    const values: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    const touched: Record<string, boolean> = {};

    // Initialize field values
    fields.forEach((field) => {
      const initialValue = initialValues[field.key];

      if (initialValue !== undefined) {
        values[field.key] = initialValue;
      } else {
        // Set default values based on field type
        values[field.key] = this.getDefaultValue(field);
      }

      errors[field.key] = [];
      warnings[field.key] = [];
      touched[field.key] = false;
    });

    return {
      values,
      errors,
      warnings,
      touched,
      isValid: true,
      isSubmitting: false,
      isDirty: false,
    };
  }

  /**
   * Validate form state
   */
  validateFormState(
    formState: FormState,
    fields: SpecificationFieldConfig[],
    categoryId?: string
  ): FormValidationResult {
    return this.validationEngine.validateForm(
      fields,
      formState.values,
      categoryId
    );
  }

  /**
   * Update form state with new values
   */
  updateFormState(
    currentState: FormState,
    updates: Partial<FormState>
  ): FormState {
    return {
      ...currentState,
      ...updates,
      isDirty: true,
    };
  }

  /**
   * Handle field value change
   */
  handleFieldChange(
    formState: FormState,
    fieldKey: string,
    value: any,
    fields: SpecificationFieldConfig[]
  ): FormState {
    const newValues = {
      ...formState.values,
      [fieldKey]: value,
    };

    const newTouched = {
      ...formState.touched,
      [fieldKey]: true,
    };

    // Validate the changed field
    const field = fields.find((f) => f.key === fieldKey);
    if (field) {
      const validationResult = this.validationEngine.validateField(
        field,
        value,
        {
          fieldKey,
          allValues: newValues,
          isRequired: field.required || false,
          fieldConfig: field,
        }
      );

      const newErrors = {
        ...formState.errors,
        [fieldKey]: validationResult.errors,
      };

      const newWarnings = {
        ...formState.warnings,
        [fieldKey]: validationResult.warnings,
      };

      return {
        ...formState,
        values: newValues,
        touched: newTouched,
        errors: newErrors,
        warnings: newWarnings,
        isDirty: true,
        isValid: Object.values(newErrors).every((errs) => errs.length === 0),
      };
    }

    return {
      ...formState,
      values: newValues,
      touched: newTouched,
      isDirty: true,
    };
  }

  /**
   * Clear form cache
   */
  clearCache(): void {
    this.formCache.clear();
  }

  /**
   * Process fields based on options
   */
  private processFields(
    fields: SpecificationFieldConfig[],
    options: FormGenerationOptions
  ): SpecificationFieldConfig[] {
    let processedFields = [...fields];

    // Filter out excluded fields
    if (options.excludeFields && options.excludeFields.length > 0) {
      processedFields = processedFields.filter(
        (field) => !options.excludeFields!.includes(field.key)
      );
    }

    // Filter optional fields if not included
    if (!options.includeOptionalFields) {
      processedFields = processedFields.filter((field) => field.required);
    }

    // Apply field overrides
    if (options.fieldOverrides) {
      processedFields = processedFields.map((field) => {
        const override = options.fieldOverrides![field.key];
        return override ? { ...field, ...override } : field;
      });
    }

    // Apply custom field order
    if (options.customFieldOrder && options.customFieldOrder.length > 0) {
      const orderedFields: SpecificationFieldConfig[] = [];
      const fieldMap = new Map(processedFields.map((f) => [f.key, f]));

      // Add fields in custom order
      options.customFieldOrder.forEach((key) => {
        const field = fieldMap.get(key);
        if (field) {
          orderedFields.push(field);
          fieldMap.delete(key);
        }
      });

      // Add remaining fields
      orderedFields.push(...Array.from(fieldMap.values()));
      processedFields = orderedFields;
    } else {
      // Sort by display order
      processedFields.sort(
        (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
      );
    }

    return processedFields;
  }

  /**
   * Process field groups
   */
  private processGroups(
    groups: FieldGroup[],
    fields: SpecificationFieldConfig[]
  ): FieldGroup[] {
    const fieldGroupIds = new Set(fields.map((f) => f.groupId).filter(Boolean));

    return groups
      .filter((group) => fieldGroupIds.has(group.id))
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }

  /**
   * Generate validation rules
   */
  private generateValidationRules(
    fields: SpecificationFieldConfig[]
  ): Record<string, any> {
    const rules: Record<string, any> = {};

    fields.forEach((field) => {
      if (field.validation) {
        rules[field.key] = field.validation;
      }
    });

    return rules;
  }

  /**
   * Generate conditional rules
   */
  private generateConditionalRules(
    fields: SpecificationFieldConfig[]
  ): Record<string, any> {
    const rules: Record<string, any> = {};

    fields.forEach((field) => {
      if (field.conditional && field.conditional.length > 0) {
        rules[field.key] = field.conditional;
      }
    });

    return rules;
  }

  /**
   * Get default value for field type
   */
  private getDefaultValue(field: SpecificationFieldConfig): any {
    switch (field.type) {
      case "boolean":
        return false;
      case "number":
      case "range":
        return field.validation?.min ?? 0;
      case "multiselect":
        return [];
      case "select":
        return field.options && field.options.length > 0
          ? field.options[0].value
          : "";
      default:
        return "";
    }
  }

  /**
   * Generate cache key for form options
   */
  private generateCacheKey(options: FormGenerationOptions): string {
    return JSON.stringify({
      categoryId: options.categoryId,
      includeOptionalFields: options.includeOptionalFields,
      groupFields: options.groupFields,
      enableConditionalLogic: options.enableConditionalLogic,
      customFieldOrder: options.customFieldOrder,
      excludeFields: options.excludeFields,
      // Don't include fieldOverrides in cache key as they change frequently
    });
  }
}

// Singleton instance
let formGeneratorInstance: DynamicFormGenerator | null = null;

/**
 * Get the singleton form generator instance
 */
export const getDynamicFormGenerator = (): DynamicFormGenerator => {
  if (!formGeneratorInstance) {
    formGeneratorInstance = new DynamicFormGenerator();
  }
  return formGeneratorInstance;
};

/**
 * React hook for form generation
 */
export const useDynamicFormGenerator = () => {
  const generator = React.useMemo(() => getDynamicFormGenerator(), []);

  return React.useMemo(
    () => ({
      generateFormSchema: generator.generateFormSchema.bind(generator),
      generateForm: generator.generateForm.bind(generator),
      createInitialFormState: generator.createInitialFormState.bind(generator),
      validateFormState: generator.validateFormState.bind(generator),
      updateFormState: generator.updateFormState.bind(generator),
      handleFieldChange: generator.handleFieldChange.bind(generator),
      clearCache: generator.clearCache.bind(generator),
    }),
    [generator]
  );
};
