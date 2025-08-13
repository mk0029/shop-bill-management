/**
 * Dynamic Field Validation Engine
 * Provides comprehensive validation for dynamic specification fields
 */

import {
  SpecificationFieldConfig,
  FieldValidationResult,
  FormValidationResult,
  ValidationContext,
  CustomValidator,
} from "@/types/specification-field";

import { ValidationError } from "@/lib/specification-errors";
import { VALIDATION_LIMITS } from "@/constants/specification-constants";

/**
 * Core Validation Engine
 */
export class ValidationEngine {
  private customValidators = new Map<string, CustomValidator>();
  private validationCache = new Map<string, FieldValidationResult>();

  constructor() {
    this.registerBuiltInValidators();
  }

  /**
   * Validate a single field
   */
  validateField(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    context: Partial<ValidationContext> = {}
  ): FieldValidationResult {
    const fullContext: ValidationContext = {
      fieldKey: fieldConfig.key,
      categoryId: context.categoryId,
      allValues: context.allValues || {},
      isRequired: fieldConfig.required || false,
      fieldConfig,
    };

    // Create cache key
    const cacheKey = `${fieldConfig.key}_${JSON.stringify(value)}_${fieldConfig.version}`;

    // Check cache
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result = this.performFieldValidation(fieldConfig, value, fullContext);

    // Cache result
    this.validationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Validate entire form
   */
  validateForm(
    fields: SpecificationFieldConfig[],
    values: Record<string, any>,
    categoryId?: string
  ): FormValidationResult {
    const fieldResults: Record<string, FieldValidationResult> = {};
    const globalErrors: string[] = [];
    const globalWarnings: string[] = [];

    // Validate each field
    for (const field of fields) {
      const value = values[field.key];
      const context: ValidationContext = {
        fieldKey: field.key,
        categoryId,
        allValues: values,
        isRequired: field.required || false,
        fieldConfig: field,
      };

      fieldResults[field.key] = this.validateField(field, value, context);
    }

    // Check for global validation rules
    const requiredFields = fields.filter((f) => f.required);
    const filledRequiredFields = requiredFields.filter((f) => {
      const value = values[f.key];
      return value !== undefined && value !== null && value !== "";
    });

    if (requiredFields.length > 0 && filledRequiredFields.length === 0) {
      globalErrors.push("At least one required field must be filled");
    }

    // Check field dependencies and conditional rules
    this.validateConditionalRules(fields, values, fieldResults, globalErrors);

    const isValid =
      Object.values(fieldResults).every((result) => result.isValid) &&
      globalErrors.length === 0;

    return {
      isValid,
      fieldResults,
      globalErrors,
      globalWarnings,
    };
  }

  /**
   * Register custom validator
   */
  registerCustomValidator(validator: CustomValidator): void {
    this.customValidators.set(validator.name, validator);
  }

  /**
   * Execute custom validator
   */
  executeCustomValidator(
    name: string,
    value: any,
    context: ValidationContext
  ): FieldValidationResult {
    const validator = this.customValidators.get(name);
    if (!validator) {
      return {
        isValid: false,
        errors: [`Custom validator '${name}' not found`],
        warnings: [],
      };
    }

    try {
      return validator.validate(value, context);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Custom validator '${name}' failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Perform actual field validation
   */
  private performFieldValidation(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    context: ValidationContext
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (fieldConfig.required && this.isEmpty(value)) {
      errors.push(`${fieldConfig.label} is required`);
      return { isValid: false, errors, warnings };
    }

    // Skip further validation if field is empty and not required
    if (!fieldConfig.required && this.isEmpty(value)) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Type-specific validation
    this.validateByType(fieldConfig, value, errors, warnings);

    // Validation rules
    if (fieldConfig.validation) {
      this.validateRules(fieldConfig, value, errors, warnings);
    }

    // Custom validator
    if (fieldConfig.validation?.customValidator) {
      const customResult = this.executeCustomValidator(
        fieldConfig.validation.customValidator,
        value,
        context
      );
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      value: this.transformValue(fieldConfig, value),
    };
  }

  /**
   * Validate by field type
   */
  private validateByType(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    switch (fieldConfig.type) {
      case "number":
      case "range":
        this.validateNumber(fieldConfig, value, errors, warnings);
        break;

      case "text":
      case "textarea":
        this.validateText(fieldConfig, value, errors, warnings);
        break;

      case "email":
        this.validateEmail(fieldConfig, value, errors, warnings);
        break;

      case "url":
        this.validateUrl(fieldConfig, value, errors, warnings);
        break;

      case "date":
        this.validateDate(fieldConfig, value, errors, warnings);
        break;

      case "select":
        this.validateSelect(fieldConfig, value, errors, warnings);
        break;

      case "multiselect":
        this.validateMultiSelect(fieldConfig, value, errors, warnings);
        break;

      case "boolean":
        this.validateBoolean(fieldConfig, value, errors, warnings);
        break;
    }
  }

  /**
   * Validate number fields
   */
  private validateNumber(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      errors.push(`${fieldConfig.label} must be a valid number`);
      return;
    }

    // Special validation for watts
    if (fieldConfig.key === "watts") {
      if (numValue < VALIDATION_LIMITS.MIN_WATTS) {
        errors.push(
          `${fieldConfig.label} must be at least ${VALIDATION_LIMITS.MIN_WATTS}W`
        );
      }
      if (numValue > VALIDATION_LIMITS.MAX_WATTS) {
        errors.push(
          `${fieldConfig.label} cannot exceed ${VALIDATION_LIMITS.MAX_WATTS}W`
        );
      }
      if (numValue > 1000) {
        warnings.push(
          `High wattage detected (${numValue}W). Please verify this is correct.`
        );
      }
    }

    // Special validation for voltage
    if (fieldConfig.key === "voltage") {
      const voltageNum = parseFloat(value.toString().replace("V", ""));
      if (voltageNum < VALIDATION_LIMITS.MIN_VOLTAGE) {
        errors.push(
          `${fieldConfig.label} must be at least ${VALIDATION_LIMITS.MIN_VOLTAGE}V`
        );
      }
      if (voltageNum > VALIDATION_LIMITS.MAX_VOLTAGE) {
        errors.push(
          `${fieldConfig.label} cannot exceed ${VALIDATION_LIMITS.MAX_VOLTAGE}V`
        );
      }
    }

    // Special validation for amperage
    if (fieldConfig.key === "amperage") {
      const amperageNum = parseFloat(value.toString().replace("A", ""));
      if (amperageNum < VALIDATION_LIMITS.MIN_AMPERAGE) {
        errors.push(
          `${fieldConfig.label} must be at least ${VALIDATION_LIMITS.MIN_AMPERAGE}A`
        );
      }
      if (amperageNum > VALIDATION_LIMITS.MAX_AMPERAGE) {
        errors.push(
          `${fieldConfig.label} cannot exceed ${VALIDATION_LIMITS.MAX_AMPERAGE}A`
        );
      }
    }
  }

  /**
   * Validate text fields
   */
  private validateText(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    const strValue = String(value);

    if (strValue.length > VALIDATION_LIMITS.MAX_TEXT_LENGTH) {
      errors.push(
        `${fieldConfig.label} cannot exceed ${VALIDATION_LIMITS.MAX_TEXT_LENGTH} characters`
      );
    }

    // Check for potentially unsafe content
    if (/<script|javascript:|data:/i.test(strValue)) {
      errors.push(`${fieldConfig.label} contains potentially unsafe content`);
    }
  }

  /**
   * Validate email fields
   */
  private validateEmail(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(value))) {
      errors.push(`${fieldConfig.label} must be a valid email address`);
    }
  }

  /**
   * Validate URL fields
   */
  private validateUrl(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    try {
      new URL(String(value));
    } catch {
      errors.push(`${fieldConfig.label} must be a valid URL`);
    }
  }

  /**
   * Validate date fields
   */
  private validateDate(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(`${fieldConfig.label} must be a valid date`);
    }
  }

  /**
   * Validate select fields
   */
  private validateSelect(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (fieldConfig.options && fieldConfig.options.length > 0) {
      const validValues = fieldConfig.options.map((opt) => opt.value);
      if (!validValues.includes(String(value))) {
        errors.push(
          `${fieldConfig.label} must be one of: ${validValues.join(", ")}`
        );
      }
    }
  }

  /**
   * Validate multiselect fields
   */
  private validateMultiSelect(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push(`${fieldConfig.label} must be an array of values`);
      return;
    }

    if (fieldConfig.options && fieldConfig.options.length > 0) {
      const validValues = fieldConfig.options.map((opt) => opt.value);
      const invalidValues = value.filter(
        (v) => !validValues.includes(String(v))
      );

      if (invalidValues.length > 0) {
        errors.push(
          `${fieldConfig.label} contains invalid options: ${invalidValues.join(", ")}`
        );
      }
    }
  }

  /**
   * Validate boolean fields
   */
  private validateBoolean(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (typeof value !== "boolean" && value !== "true" && value !== "false") {
      errors.push(`${fieldConfig.label} must be true or false`);
    }
  }

  /**
   * Validate field rules
   */
  private validateRules(
    fieldConfig: SpecificationFieldConfig,
    value: any,
    errors: string[],
    warnings: string[]
  ): void {
    const rules = fieldConfig.validation!;

    // Min/Max for numbers
    if (typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldConfig.label} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldConfig.label} cannot exceed ${rules.max}`);
      }
    }

    // Length for strings
    if (typeof value === "string") {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(
          `${fieldConfig.label} must be at least ${rules.minLength} characters`
        );
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(
          `${fieldConfig.label} cannot exceed ${rules.maxLength} characters`
        );
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === "string") {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors.push(
          rules.errorMessage || `${fieldConfig.label} format is invalid`
        );
      }
    }
  }

  /**
   * Validate conditional rules
   */
  private validateConditionalRules(
    fields: SpecificationFieldConfig[],
    values: Record<string, any>,
    fieldResults: Record<string, FieldValidationResult>,
    globalErrors: string[]
  ): void {
    for (const field of fields) {
      if (!field.conditional) continue;

      for (const rule of field.conditional) {
        const dependentValue = values[rule.dependsOn];
        const conditionMet = this.evaluateCondition(
          rule.condition,
          dependentValue,
          rule.value
        );

        if (conditionMet && rule.action === "require") {
          const fieldValue = values[field.key];
          if (this.isEmpty(fieldValue)) {
            fieldResults[field.key] = {
              isValid: false,
              errors: [
                `${field.label} is required when ${rule.dependsOn} is ${rule.value}`,
              ],
              warnings: [],
            };
          }
        }
      }
    }
  }

  /**
   * Evaluate conditional rule
   */
  private evaluateCondition(
    condition: string,
    actualValue: any,
    expectedValue: any
  ): boolean {
    switch (condition) {
      case "equals":
        return actualValue === expectedValue;
      case "not_equals":
        return actualValue !== expectedValue;
      case "contains":
        return String(actualValue).includes(String(expectedValue));
      case "greater_than":
        return Number(actualValue) > Number(expectedValue);
      case "less_than":
        return Number(actualValue) < Number(expectedValue);
      case "in":
        return (
          Array.isArray(expectedValue) && expectedValue.includes(actualValue)
        );
      case "not_in":
        return (
          Array.isArray(expectedValue) && !expectedValue.includes(actualValue)
        );
      default:
        return false;
    }
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  /**
   * Transform value based on field configuration
   */
  private transformValue(
    fieldConfig: SpecificationFieldConfig,
    value: any
  ): any {
    if (this.isEmpty(value)) return value;

    switch (fieldConfig.type) {
      case "number":
      case "range":
        return Number(value);

      case "boolean":
        return typeof value === "boolean" ? value : value === "true";

      case "multiselect":
        return Array.isArray(value) ? value : [value];

      default:
        return value;
    }
  }

  /**
   * Register built-in validators
   */
  private registerBuiltInValidators(): void {
    // Watts validator
    this.registerCustomValidator({
      name: "watts_validator",
      description: "Validates electrical power consumption",
      validate: (value: any, context: ValidationContext) => {
        const numValue = Number(value);
        const errors: string[] = [];
        const warnings: string[] = [];

        if (isNaN(numValue)) {
          errors.push("Watts must be a valid number");
        } else {
          if (numValue < 0.1) errors.push("Watts must be at least 0.1W");
          if (numValue > 2000) errors.push("Watts cannot exceed 2000W");
          if (numValue > 1000)
            warnings.push("High wattage detected. Please verify.");
        }

        return { isValid: errors.length === 0, errors, warnings };
      },
    });

    // Wire gauge validator
    this.registerCustomValidator({
      name: "wire_gauge_validator",
      description: "Validates wire gauge specifications",
      validate: (value: any, context: ValidationContext) => {
        const numValue = Number(value);
        const errors: string[] = [];
        const warnings: string[] = [];

        if (isNaN(numValue)) {
          errors.push("Wire gauge must be a valid number");
        } else {
          if (numValue < 0.1)
            errors.push("Wire gauge must be at least 0.1 sq mm");
          if (numValue > 50) errors.push("Wire gauge cannot exceed 50 sq mm");
        }

        return { isValid: errors.length === 0, errors, warnings };
      },
    });
  }
}

// Singleton instance
let validationEngineInstance: ValidationEngine | null = null;

/**
 * Get the singleton validation engine instance
 */
export const getValidationEngine = (): ValidationEngine => {
  if (!validationEngineInstance) {
    validationEngineInstance = new ValidationEngine();
  }
  return validationEngineInstance;
};

/**
 * React hook for validation
 */
export const useValidationEngine = () => {
  const engine = getValidationEngine();

  return {
    validateField: (
      fieldConfig: SpecificationFieldConfig,
      value: any,
      context?: Partial<ValidationContext>
    ) => engine.validateField(fieldConfig, value, context),
    validateForm: (
      fields: SpecificationFieldConfig[],
      values: Record<string, any>,
      categoryId?: string
    ) => engine.validateForm(fields, values, categoryId),
    registerCustomValidator: (validator: CustomValidator) =>
      engine.registerCustomValidator(validator),
    clearCache: () => engine.clearCache(),
  };
};
