/**
 * Dynamic Specification Field System Types
 * Core interfaces and types for the centralized field configuration system
 */

// Field Types
export type FieldType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "textarea"
  | "email"
  | "url"
  | "date"
  | "range";

// Category Types
export type CategoryType =
  | "ampere"
  | "volt-watt"
  | "wire"
  | "light"
  | "general";

// Conditional Logic Types
export type ConditionalCondition =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "in"
  | "not_in";

export type ConditionalAction =
  | "show"
  | "hide"
  | "require"
  | "disable"
  | "enable";

// Validation Rules Interface
export interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string; // Function name or identifier
  errorMessage?: string;
  required?: boolean;
}

// Field Options Interface
export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  group?: string;
}

// Conditional Rule Interface
export interface ConditionalRule {
  dependsOn: string;
  condition: ConditionalCondition;
  value: any;
  action: ConditionalAction;
  message?: string; // Optional message to show when condition is met
}

// Formatting Rules Interface
export interface FormattingRules {
  prefix?: string;
  suffix?: string;
  transform?: "uppercase" | "lowercase" | "capitalize" | "none";
  displayFormat?: string; // For numbers, dates, etc.
  decimalPlaces?: number; // For number fields
}

// Field Group Interface
export interface FieldGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  displayOrder?: number;
}

// Main Specification Field Configuration Interface
export interface SpecificationFieldConfig {
  // Core Properties
  id: string;
  key: string; // Unique field identifier (e.g., 'watts', 'voltage')
  label: string; // Display label (e.g., 'Watts', 'Voltage')
  type: FieldType;

  // Category Assignment
  categories: string[]; // Category IDs this field applies to
  categoryType?: CategoryType; // Optional category type grouping

  // Validation Rules
  required?: boolean;
  validation?: ValidationRules;

  // UI Configuration
  placeholder?: string;
  description?: string;
  helpText?: string;
  displayOrder?: number;
  groupId?: string; // Reference to FieldGroup

  // Field Options (for select/multiselect)
  options?: FieldOption[];
  optionsSource?: "static" | "dynamic" | "api"; // How options are loaded
  optionsEndpoint?: string; // API endpoint for dynamic options

  // Conditional Logic
  conditional?: ConditionalRule[];

  // Formatting and Display
  formatting?: FormattingRules;

  // Advanced Properties
  searchable?: boolean; // Can this field be used in search/filters
  sortable?: boolean; // Can this field be used for sorting
  exportable?: boolean; // Should this field be included in exports

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  createdBy?: string;
  updatedBy?: string;
}

// Validation Result Interfaces
export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  value?: any; // Processed/formatted value
}

export interface FormValidationResult {
  isValid: boolean;
  fieldResults: Record<string, FieldValidationResult>;
  globalErrors: string[];
  globalWarnings: string[];
}

// Field Error Types
export interface FieldError {
  fieldKey: string;
  message: string;
  code: string;
  severity: "error" | "warning" | "info";
  context?: Record<string, any>;
}

// Registry Event Types
export type RegistryEventType =
  | "field_added"
  | "field_updated"
  | "field_removed"
  | "field_activated"
  | "field_deactivated"
  | "category_mapping_changed";

export interface RegistryEvent {
  type: RegistryEventType;
  fieldKey: string;
  timestamp: string;
  data?: any;
}

// Registry Subscriber Interface
export interface RegistrySubscriber {
  id: string;
  onFieldChange: (event: RegistryEvent) => void;
}

// Form Schema Interface
export interface FormSchema {
  categoryId: string;
  fields: SpecificationFieldConfig[];
  groups: FieldGroup[];
  validationRules: Record<string, ValidationRules>;
  conditionalRules: Record<string, ConditionalRule[]>;
}

// Field Component Props Interface
export interface FieldComponentProps {
  config: SpecificationFieldConfig;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string[];
  warning?: string[];
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  className?: string;
  "data-testid"?: string;
}

// Validation Context Interface
export interface ValidationContext {
  fieldKey: string;
  categoryId?: string;
  allValues: Record<string, any>;
  isRequired: boolean;
  fieldConfig: SpecificationFieldConfig;
}

// Custom Validator Interface
export interface CustomValidator {
  name: string;
  validate: (value: any, context: ValidationContext) => FieldValidationResult;
  description?: string;
}

// Category Field Mapping Interface
export interface CategoryFieldMapping {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  fields: string[]; // Field keys
  requiredFields: string[]; // Required field keys
  fieldGroups: FieldGroup[];
  displayOrder?: number;
  isActive: boolean;
}

// Field Configuration Error Types
export class FieldConfigurationError extends Error {
  constructor(
    public fieldKey: string,
    public errorType:
      | "INVALID_TYPE"
      | "MISSING_OPTIONS"
      | "CIRCULAR_DEPENDENCY"
      | "VALIDATION_ERROR"
      | "DUPLICATE_KEY",
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "FieldConfigurationError";
  }
}

// Field Registry Configuration
export interface FieldRegistryConfig {
  cacheTimeout: number; // Cache TTL in milliseconds
  enableRealTimeUpdates: boolean;
  validateOnLoad: boolean;
  enablePerformanceMetrics: boolean;
  maxFieldsPerCategory: number;
  maxConditionalDepth: number;
}

// Performance Metrics Interface
export interface PerformanceMetrics {
  fieldLoadTime: number;
  validationTime: number;
  formRenderTime: number;
  categoryChangeTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

// Export utility types
export type FieldConfigurationPartial = Partial<SpecificationFieldConfig>;
export type FieldValidationRules = Pick<
  SpecificationFieldConfig,
  "validation" | "required"
>;
export type FieldDisplayConfig = Pick<
  SpecificationFieldConfig,
  "label" | "placeholder" | "description" | "helpText"
>;

// Default field configurations for common types
export const DEFAULT_FIELD_CONFIGS: Record<
  FieldType,
  Partial<SpecificationFieldConfig>
> = {
  text: {
    type: "text",
    validation: { maxLength: 255 },
    searchable: true,
    sortable: true,
    exportable: true,
  },
  number: {
    type: "number",
    validation: { min: 0 },
    searchable: true,
    sortable: true,
    exportable: true,
    formatting: { decimalPlaces: 2 },
  },
  select: {
    type: "select",
    optionsSource: "static",
    searchable: true,
    sortable: true,
    exportable: true,
  },
  multiselect: {
    type: "multiselect",
    optionsSource: "static",
    searchable: true,
    sortable: false,
    exportable: true,
  },
  boolean: {
    type: "boolean",
    searchable: true,
    sortable: true,
    exportable: true,
  },
  textarea: {
    type: "textarea",
    validation: { maxLength: 1000 },
    searchable: true,
    sortable: false,
    exportable: true,
  },
  email: {
    type: "email",
    validation: {
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      errorMessage: "Please enter a valid email address",
    },
    searchable: true,
    sortable: true,
    exportable: true,
  },
  url: {
    type: "url",
    validation: {
      pattern: "^https?:\\/\\/.+",
      errorMessage: "Please enter a valid URL",
    },
    searchable: true,
    sortable: true,
    exportable: true,
  },
  date: {
    type: "date",
    searchable: true,
    sortable: true,
    exportable: true,
  },
  range: {
    type: "range",
    validation: { min: 0, max: 100 },
    searchable: true,
    sortable: true,
    exportable: true,
  },
};
