/**
 * Specification Field System Error Classes
 * Comprehensive error handling for the dynamic specification system
 */

import { FieldType, CategoryType } from "@/types/specification-field";

// Base error class for all specification-related errors
export abstract class SpecificationError extends Error {
  public readonly timestamp: string;
  public readonly context: Record<string, any>;

  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Field Configuration Errors
export class FieldConfigurationError extends SpecificationError {
  constructor(
    public readonly fieldKey: string,
    public readonly errorType:
      | "INVALID_TYPE"
      | "MISSING_OPTIONS"
      | "CIRCULAR_DEPENDENCY"
      | "VALIDATION_ERROR"
      | "DUPLICATE_KEY"
      | "INVALID_CATEGORY"
      | "MISSING_REQUIRED_PROPERTY"
      | "INVALID_CONDITIONAL_RULE",
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, { ...context, fieldKey, errorType });
    this.fieldKey = fieldKey;
    this.errorType = errorType;
  }

  static invalidType(
    fieldKey: string,
    providedType: string,
    validTypes: FieldType[]
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "INVALID_TYPE",
      `Invalid field type '${providedType}' for field '${fieldKey}'. Valid types are: ${validTypes.join(", ")}`,
      { providedType, validTypes }
    );
  }

  static missingOptions(
    fieldKey: string,
    fieldType: FieldType
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "MISSING_OPTIONS",
      `Field '${fieldKey}' of type '${fieldType}' requires options to be defined`,
      { fieldType }
    );
  }

  static circularDependency(
    fieldKey: string,
    dependencyChain: string[]
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "CIRCULAR_DEPENDENCY",
      `Circular dependency detected for field '${fieldKey}'. Dependency chain: ${dependencyChain.join(" -> ")}`,
      { dependencyChain }
    );
  }

  static duplicateKey(
    fieldKey: string,
    existingFieldId: string
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "DUPLICATE_KEY",
      `Field key '${fieldKey}' is already in use by field ID '${existingFieldId}'`,
      { existingFieldId }
    );
  }

  static invalidCategory(
    fieldKey: string,
    categoryId: string
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "INVALID_CATEGORY",
      `Invalid category '${categoryId}' assigned to field '${fieldKey}'`,
      { categoryId }
    );
  }

  static missingRequiredProperty(
    fieldKey: string,
    property: string
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "MISSING_REQUIRED_PROPERTY",
      `Required property '${property}' is missing for field '${fieldKey}'`,
      { property }
    );
  }

  static invalidConditionalRule(
    fieldKey: string,
    rule: any,
    reason: string
  ): FieldConfigurationError {
    return new FieldConfigurationError(
      fieldKey,
      "INVALID_CONDITIONAL_RULE",
      `Invalid conditional rule for field '${fieldKey}': ${reason}`,
      { rule, reason }
    );
  }
}

// Validation Errors
export class ValidationError extends SpecificationError {
  constructor(
    public readonly fieldKey: string,
    public readonly validationType:
      | "REQUIRED_FIELD"
      | "TYPE_MISMATCH"
      | "OUT_OF_RANGE"
      | "PATTERN_MISMATCH"
      | "CUSTOM_VALIDATION_FAILED"
      | "CONDITIONAL_VALIDATION_FAILED",
    message: string,
    public readonly value: any,
    context: Record<string, any> = {}
  ) {
    super(message, { ...context, fieldKey, validationType, value });
  }

  static requiredField(fieldKey: string): ValidationError {
    return new ValidationError(
      fieldKey,
      "REQUIRED_FIELD",
      `Field '${fieldKey}' is required`,
      undefined
    );
  }

  static typeMismatch(
    fieldKey: string,
    expectedType: FieldType,
    actualValue: any
  ): ValidationError {
    return new ValidationError(
      fieldKey,
      "TYPE_MISMATCH",
      `Field '${fieldKey}' expects type '${expectedType}' but received '${typeof actualValue}'`,
      actualValue,
      { expectedType, actualType: typeof actualValue }
    );
  }

  static outOfRange(
    fieldKey: string,
    value: number,
    min?: number,
    max?: number
  ): ValidationError {
    const rangeText =
      min !== undefined && max !== undefined
        ? `between ${min} and ${max}`
        : min !== undefined
          ? `at least ${min}`
          : `at most ${max}`;

    return new ValidationError(
      fieldKey,
      "OUT_OF_RANGE",
      `Field '${fieldKey}' value ${value} is not ${rangeText}`,
      value,
      { min, max }
    );
  }

  static patternMismatch(
    fieldKey: string,
    value: string,
    pattern: string
  ): ValidationError {
    return new ValidationError(
      fieldKey,
      "PATTERN_MISMATCH",
      `Field '${fieldKey}' value does not match required pattern`,
      value,
      { pattern }
    );
  }

  static customValidationFailed(
    fieldKey: string,
    value: any,
    validatorName: string,
    customMessage?: string
  ): ValidationError {
    return new ValidationError(
      fieldKey,
      "CUSTOM_VALIDATION_FAILED",
      customMessage ||
        `Field '${fieldKey}' failed custom validation '${validatorName}'`,
      value,
      { validatorName, customMessage }
    );
  }
}

// Registry Errors
export class RegistryError extends SpecificationError {
  constructor(
    public readonly operation:
      | "LOAD_FIELDS"
      | "REGISTER_FIELD"
      | "UPDATE_FIELD"
      | "REMOVE_FIELD"
      | "SUBSCRIBE"
      | "UNSUBSCRIBE"
      | "CACHE_OPERATION",
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, { ...context, operation });
  }

  static loadFieldsFailed(
    reason: string,
    context: Record<string, any> = {}
  ): RegistryError {
    return new RegistryError(
      "LOAD_FIELDS",
      `Failed to load field configurations: ${reason}`,
      context
    );
  }

  static registerFieldFailed(fieldKey: string, reason: string): RegistryError {
    return new RegistryError(
      "REGISTER_FIELD",
      `Failed to register field '${fieldKey}': ${reason}`,
      { fieldKey }
    );
  }

  static updateFieldFailed(fieldKey: string, reason: string): RegistryError {
    return new RegistryError(
      "UPDATE_FIELD",
      `Failed to update field '${fieldKey}': ${reason}`,
      { fieldKey }
    );
  }

  static removeFieldFailed(fieldKey: string, reason: string): RegistryError {
    return new RegistryError(
      "REMOVE_FIELD",
      `Failed to remove field '${fieldKey}': ${reason}`,
      { fieldKey }
    );
  }

  static cacheOperationFailed(
    operation: string,
    reason: string
  ): RegistryError {
    return new RegistryError(
      "CACHE_OPERATION",
      `Cache operation '${operation}' failed: ${reason}`,
      { cacheOperation: operation }
    );
  }
}

// Form Generation Errors
export class FormGenerationError extends SpecificationError {
  constructor(
    public readonly categoryId: string,
    public readonly generationType:
      | "SCHEMA_GENERATION"
      | "COMPONENT_CREATION"
      | "VALIDATION_SETUP"
      | "CONDITIONAL_LOGIC_SETUP",
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, { ...context, categoryId, generationType });
  }

  static schemaGenerationFailed(
    categoryId: string,
    reason: string
  ): FormGenerationError {
    return new FormGenerationError(
      categoryId,
      "SCHEMA_GENERATION",
      `Failed to generate form schema for category '${categoryId}': ${reason}`
    );
  }

  static componentCreationFailed(
    categoryId: string,
    fieldKey: string,
    reason: string
  ): FormGenerationError {
    return new FormGenerationError(
      categoryId,
      "COMPONENT_CREATION",
      `Failed to create component for field '${fieldKey}' in category '${categoryId}': ${reason}`,
      { fieldKey }
    );
  }

  static validationSetupFailed(
    categoryId: string,
    reason: string
  ): FormGenerationError {
    return new FormGenerationError(
      categoryId,
      "VALIDATION_SETUP",
      `Failed to setup validation for category '${categoryId}': ${reason}`
    );
  }

  static conditionalLogicSetupFailed(
    categoryId: string,
    fieldKey: string,
    reason: string
  ): FormGenerationError {
    return new FormGenerationError(
      categoryId,
      "CONDITIONAL_LOGIC_SETUP",
      `Failed to setup conditional logic for field '${fieldKey}' in category '${categoryId}': ${reason}`,
      { fieldKey }
    );
  }
}

// Performance Errors
export class PerformanceError extends SpecificationError {
  constructor(
    public readonly operation: string,
    public readonly threshold: number,
    public readonly actualTime: number,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, { ...context, operation, threshold, actualTime });
  }

  static operationTooSlow(
    operation: string,
    threshold: number,
    actualTime: number
  ): PerformanceError {
    return new PerformanceError(
      operation,
      threshold,
      actualTime,
      `Operation '${operation}' took ${actualTime}ms, exceeding threshold of ${threshold}ms`
    );
  }

  static memoryUsageHigh(
    operation: string,
    threshold: number,
    actualUsage: number
  ): PerformanceError {
    return new PerformanceError(
      operation,
      threshold,
      actualUsage,
      `Operation '${operation}' used ${actualUsage}MB memory, exceeding threshold of ${threshold}MB`
    );
  }
}

// Error Collection and Reporting
export class ErrorCollector {
  private errors: SpecificationError[] = [];
  private warnings: SpecificationError[] = [];

  addError(error: SpecificationError): void {
    this.errors.push(error);
  }

  addWarning(warning: SpecificationError): void {
    this.warnings.push(warning);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getErrors(): SpecificationError[] {
    return [...this.errors];
  }

  getWarnings(): SpecificationError[] {
    return [...this.warnings];
  }

  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  getReport(): {
    errorCount: number;
    warningCount: number;
    errors: SpecificationError[];
    warnings: SpecificationError[];
    summary: string;
  } {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      summary: `${this.errors.length} errors, ${this.warnings.length} warnings`,
    };
  }
}

// Error Handler Utility
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCollector = new ErrorCollector();
  private errorListeners: ((error: SpecificationError) => void)[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: SpecificationError): void {
    this.errorCollector.addError(error);
    this.notifyListeners(error);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Specification Error:", error);
    }
  }

  handleWarning(warning: SpecificationError): void {
    this.errorCollector.addWarning(warning);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.warn("Specification Warning:", warning);
    }
  }

  addErrorListener(listener: (error: SpecificationError) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: SpecificationError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  private notifyListeners(error: SpecificationError): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.error("Error in error listener:", e);
      }
    });
  }

  getErrorReport() {
    return this.errorCollector.getReport();
  }

  clearErrors(): void {
    this.errorCollector.clear();
  }
}

// Utility functions for error handling
export const handleSpecificationError = (
  error: unknown
): SpecificationError => {
  if (error instanceof SpecificationError) {
    return error;
  }

  if (error instanceof Error) {
    return new SpecificationError(error.message, { originalError: error });
  }

  return new SpecificationError("Unknown specification error", {
    originalError: error,
  });
};

export const isSpecificationError = (
  error: unknown
): error is SpecificationError => {
  return error instanceof SpecificationError;
};

export const getErrorHandler = () => ErrorHandler.getInstance();
