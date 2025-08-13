# Dynamic Specification System Design

## Overview

The Dynamic Specification System is a centralized, configuration-driven approach to managing product specification fields across the entire inventory management system. It eliminates the need for manual code updates when adding new specification types and provides a flexible foundation for handling diverse product categories.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Forms  │  Tables  │  Filters  │  Details  │  Import/Export │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Field Registry  │  Validation Engine  │  Form Generator   │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Sanity CMS  │  Local Cache  │  Configuration Store        │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Field Configuration Store** - Central repository for field definitions
2. **Field Registry** - Runtime registry for managing field configurations
3. **Dynamic Form Generator** - Generates forms based on field configurations
4. **Validation Engine** - Applies validation rules from field configurations
5. **UI Component Factory** - Creates appropriate UI components for each field type
6. **Category Field Mapper** - Maps fields to categories and handles inheritance

## Components and Interfaces

### 1. Field Configuration Schema

```typescript
interface SpecificationFieldConfig {
  // Core Properties
  id: string;
  key: string;
  label: string;
  type: FieldType;
  
  // Category Assignment
  categories: string[];
  categoryType?: 'ampere' | 'volt-watt' | 'wire' | 'light' | 'general';
  
  // Validation Rules
  required?: boolean;
  validation?: ValidationRules;
  
  // UI Configuration
  placeholder?: string;
  description?: string;
  displayOrder?: number;
  grouping?: string;
  
  // Field Options (for select/multiselect)
  options?: FieldOption[] | (() => Promise<FieldOption[]>);
  
  // Conditional Logic
  conditional?: ConditionalRule;
  
  // Formatting and Display
  formatting?: FormattingRules;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

type FieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'boolean' 
  | 'textarea'
  | 'email'
  | 'url'
  | 'date'
  | 'range';

interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string; // Function name or code
  errorMessage?: string;
}

interface ConditionalRule {
  dependsOn: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

interface FormattingRules {
  prefix?: string;
  suffix?: string;
  transform?: 'uppercase' | 'lowercase' | 'capitalize';
  displayFormat?: string; // For numbers, dates, etc.
}
```

### 2. Field Registry Service

```typescript
class SpecificationFieldRegistry {
  private fields: Map<string, SpecificationFieldConfig> = new Map();
  private categoryMappings: Map<string, string[]> = new Map();
  private subscribers: Set<RegistrySubscriber> = new Set();
  
  // Field Management
  async loadFields(): Promise<void>;
  registerField(config: SpecificationFieldConfig): void;
  updateField(id: string, updates: Partial<SpecificationFieldConfig>): void;
  removeField(id: string): void;
  
  // Field Retrieval
  getField(key: string): SpecificationFieldConfig | undefined;
  getFieldsForCategory(categoryId: string): SpecificationFieldConfig[];
  getRequiredFields(categoryId: string): SpecificationFieldConfig[];
  getAllFields(): SpecificationFieldConfig[];
  
  // Category Management
  getCategoryFields(categoryId: string): string[];
  setCategoryFields(categoryId: string, fieldKeys: string[]): void;
  
  // Subscription Management
  subscribe(subscriber: RegistrySubscriber): void;
  unsubscribe(subscriber: RegistrySubscriber): void;
  
  private notifySubscribers(event: RegistryEvent): void;
}
```

### 3. Dynamic Form Generator

```typescript
interface DynamicFormProps {
  categoryId: string;
  initialValues?: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  onValidationChange: (errors: Record<string, string[]>) => void;
  disabled?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

class DynamicFormGenerator {
  constructor(private registry: SpecificationFieldRegistry) {}
  
  generateForm(props: DynamicFormProps): React.ReactElement;
  generateFieldComponent(config: SpecificationFieldConfig, props: FieldProps): React.ReactElement;
  validateForm(categoryId: string, values: Record<string, any>): ValidationResult;
  getFormSchema(categoryId: string): FormSchema;
}
```

### 4. Validation Engine

```typescript
class ValidationEngine {
  constructor(private registry: SpecificationFieldRegistry) {}
  
  validateField(fieldKey: string, value: any, context?: ValidationContext): ValidationResult;
  validateForm(categoryId: string, values: Record<string, any>): FormValidationResult;
  validateConditionalRules(values: Record<string, any>, fields: SpecificationFieldConfig[]): ConditionalResult;
  
  // Custom validator support
  registerCustomValidator(name: string, validator: CustomValidator): void;
  executeCustomValidator(name: string, value: any, context: ValidationContext): ValidationResult;
}
```

### 5. UI Component Factory

```typescript
interface FieldComponentProps {
  config: SpecificationFieldConfig;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string[];
  disabled?: boolean;
  required?: boolean;
}

class UIComponentFactory {
  private componentMap: Map<FieldType, React.ComponentType<FieldComponentProps>> = new Map();
  
  registerComponent(type: FieldType, component: React.ComponentType<FieldComponentProps>): void;
  createComponent(config: SpecificationFieldConfig, props: FieldComponentProps): React.ReactElement;
  
  // Built-in component creators
  private createTextInput(props: FieldComponentProps): React.ReactElement;
  private createNumberInput(props: FieldComponentProps): React.ReactElement;
  private createSelectInput(props: FieldComponentProps): React.ReactElement;
  private createMultiSelectInput(props: FieldComponentProps): React.ReactElement;
  private createBooleanInput(props: FieldComponentProps): React.ReactElement;
}
```

## Data Models

### 1. Sanity Schema for Field Configuration

```javascript
// sanity-schemas/specification-field.js
export default {
  name: 'specificationField',
  title: 'Specification Field',
  type: 'document',
  fields: [
    {
      name: 'key',
      title: 'Field Key',
      type: 'string',
      validation: Rule => Rule.required().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    },
    {
      name: 'label',
      title: 'Display Label',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'type',
      title: 'Field Type',
      type: 'string',
      options: {
        list: [
          {title: 'Text', value: 'text'},
          {title: 'Number', value: 'number'},
          {title: 'Select', value: 'select'},
          {title: 'Multi-Select', value: 'multiselect'},
          {title: 'Boolean', value: 'boolean'},
          {title: 'Textarea', value: 'textarea'}
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'categories',
      title: 'Applicable Categories',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'category'}]}]
    },
    {
      name: 'required',
      title: 'Required Field',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'validation',
      title: 'Validation Rules',
      type: 'object',
      fields: [
        {name: 'min', type: 'number'},
        {name: 'max', type: 'number'},
        {name: 'minLength', type: 'number'},
        {name: 'maxLength', type: 'number'},
        {name: 'pattern', type: 'string'},
        {name: 'errorMessage', type: 'string'}
      ]
    },
    {
      name: 'options',
      title: 'Field Options',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {name: 'value', type: 'string'},
          {name: 'label', type: 'string'},
          {name: 'disabled', type: 'boolean'}
        ]
      }],
      hidden: ({document}) => !['select', 'multiselect'].includes(document?.type)
    },
    {
      name: 'conditional',
      title: 'Conditional Logic',
      type: 'object',
      fields: [
        {name: 'dependsOn', type: 'string'},
        {name: 'condition', type: 'string'},
        {name: 'value', type: 'string'},
        {name: 'action', type: 'string'}
      ]
    },
    {
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      initialValue: 100
    },
    {
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true
    }
  ]
}
```

### 2. Category Field Mapping Schema

```javascript
// sanity-schemas/category-field-mapping.js
export default {
  name: 'categoryFieldMapping',
  title: 'Category Field Mapping',
  type: 'document',
  fields: [
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      validation: Rule => Rule.required()
    },
    {
      name: 'fields',
      title: 'Specification Fields',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'specificationField'}]}]
    },
    {
      name: 'requiredFields',
      title: 'Required Fields',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'specificationField'}]}]
    },
    {
      name: 'fieldGroups',
      title: 'Field Groups',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {name: 'name', type: 'string'},
          {name: 'label', type: 'string'},
          {name: 'fields', type: 'array', of: [{type: 'reference', to: [{type: 'specificationField'}]}]},
          {name: 'collapsible', type: 'boolean'},
          {name: 'defaultExpanded', type: 'boolean'}
        ]
      }]
    }
  ]
}
```

## Error Handling

### 1. Field Configuration Errors

```typescript
class FieldConfigurationError extends Error {
  constructor(
    public fieldKey: string,
    public errorType: 'INVALID_TYPE' | 'MISSING_OPTIONS' | 'CIRCULAR_DEPENDENCY' | 'VALIDATION_ERROR',
    message: string
  ) {
    super(message);
  }
}
```

### 2. Validation Error Handling

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
  warnings: FieldWarning[];
}

interface FieldError {
  fieldKey: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}
```

### 3. Graceful Degradation

- If a field configuration is invalid, show a fallback text input
- If field options fail to load, provide manual text entry
- If validation rules fail, apply basic required field validation
- Log all configuration errors for admin review

## Testing Strategy

### 1. Unit Tests

- Field registry operations (add, update, remove, query)
- Validation engine with various field types and rules
- Form generation with different category configurations
- UI component factory with all supported field types
- Conditional logic evaluation

### 2. Integration Tests

- End-to-end form generation and submission
- Category switching with field updates
- Import/export with dynamic fields
- API endpoints with dynamic field validation
- Real-time field configuration updates

### 3. Performance Tests

- Form loading with 100+ fields
- Field validation with complex rules
- Category switching performance
- Concurrent user field configuration changes
- Memory usage with large field configurations

### 4. User Acceptance Tests

- Admin field configuration workflow
- User form completion with dynamic fields
- Field validation feedback
- Import/export functionality
- Mobile responsiveness with dynamic forms

## Security Considerations

### 1. Field Configuration Access Control

- Only admin users can modify field configurations
- Field configuration changes are logged and auditable
- Validation rules cannot execute arbitrary code
- Custom validators are sandboxed and reviewed

### 2. Data Validation Security

- All field values are sanitized before storage
- SQL injection prevention in dynamic queries
- XSS prevention in dynamic field rendering
- Input validation on both client and server

### 3. API Security

- Field configuration endpoints require admin authentication
- Rate limiting on field configuration changes
- Validation of field configuration schema
- Audit logging of all configuration changes

## Performance Optimizations

### 1. Caching Strategy

- Field configurations cached in memory with TTL
- Category field mappings cached per category
- Validation rules compiled and cached
- UI components memoized by field type

### 2. Lazy Loading

- Field options loaded on demand
- Conditional field logic evaluated only when needed
- Form sections loaded progressively
- Validation rules loaded per field type

### 3. Optimization Techniques

- Virtual scrolling for large field lists
- Debounced validation for real-time feedback
- Batch field updates to reduce re-renders
- Efficient diff algorithms for field changes

This design provides a robust, scalable foundation for managing dynamic specification fields while maintaining performance and user experience.