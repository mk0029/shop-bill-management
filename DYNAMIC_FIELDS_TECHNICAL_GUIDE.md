# Dynamic Specification Fields - Technical Guide

## Overview

The Dynamic Specification Fields system is a comprehensive solution for managing product specification fields in the inventory management system. It allows administrators to define, configure, and manage specification fields without requiring code changes.

## Architecture

### Core Components

1. **Field Registry** (`src/lib/field-registry.ts`)
   - Central registry for all field configurations
   - Handles field CRUD operations
   - Manages field caching and subscriptions

2. **Validation Engine** (`src/lib/validation-engine.ts`)
   - Validates field values based on configuration
   - Supports custom validators
   - Handles conditional validation rules

3. **UI Component Factory** (`src/components/dynamic-fields/ui-component-factory.tsx`)
   - Creates appropriate UI components for each field type
   - Supports component memoization for performance
   - Extensible component registration system

4. **Form Generation Engine** (`src/lib/form-generation-engine.ts`)
   - Generates forms based on category configurations
   - Manages form state and validation
   - Supports conditional field logic

5. **Data Access Layer** (`src/lib/field-data-access.ts`)
   - Handles data fetching with caching
   - Provides real-time updates
   - Manages performance metrics

## Field Types

The system supports the following field types:

- **text**: Single-line text input
- **number**: Numeric input with validation
- **select**: Single-selection dropdown
- **multiselect**: Multiple-selection dropdown
- **boolean**: Checkbox, toggle, or radio buttons
- **textarea**: Multi-line text input
- **email**: Email input with validation
- **url**: URL input with validation
- **date**: Date picker
- **range**: Range slider

## Configuration Structure

### Field Configuration

```typescript
interface SpecificationFieldConfig {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  categories: string[];
  required?: boolean;
  validation?: ValidationRules;
  options?: FieldOption[];
  conditional?: ConditionalRule[];
  formatting?: FormattingRules;
  // ... other properties
}
```

### Validation Rules

```typescript
interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;
  errorMessage?: string;
}
```

### Conditional Rules

```typescript
interface ConditionalRule {
  dependsOn: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}
```

## Usage Examples

### Creating a Dynamic Form

```typescript
import { DynamicForm } from '@/components/dynamic-fields/dynamic-form';

const MyForm = () => {
  return (
    <DynamicForm
      categoryId="category-id"
      initialValues={{}}
      onFieldChange={(fieldKey, value, allValues) => {
        console.log(`Field ${fieldKey} changed to:`, value);
      }}
      onSubmit={(values) => {
        console.log('Form submitted:', values);
      }}
    />
  );
};
```

### Using the Field Registry

```typescript
import { useFieldRegistry } from '@/lib/field-registry';

const MyComponent = () => {
  const { getFieldsForCategory, isReady } = useFieldRegistry();
  
  if (!isReady) return <div>Loading...</div>;
  
  const fields = getFieldsForCategory('category-id');
  
  return (
    <div>
      {fields.map(field => (
        <div key={field.key}>{field.label}</div>
      ))}
    </div>
  );
};
```

### Custom Validation

```typescript
import { getValidationEngine } from '@/lib/validation-engine';

const engine = getValidationEngine();

// Register custom validator
engine.registerCustomValidator({
  name: 'custom_validator',
  description: 'Custom validation logic',
  validate: (value, context) => {
    if (value < 10) {
      return {
        isValid: false,
        errors: ['Value must be at least 10'],
        warnings: []
      };
    }
    return { isValid: true, errors: [], warnings: [] };
  }
});
```

## Sanity CMS Integration

### Schema Files

1. **dynamic-specification-field.js**: Main field configuration schema
2. **field-group.js**: Field grouping schema
3. **enhanced-category-field-mapping.js**: Category-field mapping schema

### Migration Script

Run the migration script to set up initial data:

```bash
node scripts/migrate-to-dynamic-fields.js migrate
```

To rollback:

```bash
node scripts/migrate-to-dynamic-fields.js rollback
```

## Performance Considerations

### Caching

- Field configurations are cached with TTL
- Form schemas are cached per category
- Component memoization reduces re-renders

### Optimization Tips

1. Use `useMemoization={true}` for frequently re-rendered forms
2. Implement field virtualization for large forms
3. Use conditional logic to reduce field count
4. Cache field options for select/multiselect fields

## Error Handling

The system includes comprehensive error handling:

- **FieldConfigurationError**: Field setup errors
- **ValidationError**: Field validation errors
- **RegistryError**: Registry operation errors
- **FormGenerationError**: Form generation errors

## Testing

### Unit Tests

```typescript
import { getValidationEngine } from '@/lib/validation-engine';

describe('ValidationEngine', () => {
  it('should validate required fields', () => {
    const engine = getValidationEngine();
    const field = { key: 'test', required: true, type: 'text' };
    const result = engine.validateField(field, '');
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Test is required');
  });
});
```

### Integration Tests

```typescript
import { DynamicForm } from '@/components/dynamic-fields/dynamic-form';
import { render, fireEvent } from '@testing-library/react';

describe('DynamicForm', () => {
  it('should render fields for category', async () => {
    const { getByTestId } = render(
      <DynamicForm categoryId="test-category" />
    );
    
    await waitFor(() => {
      expect(getByTestId('field-watts')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Fields not loading**: Check if field registry is initialized
2. **Validation not working**: Verify field configuration and validation rules
3. **Form not rendering**: Ensure category has field mappings
4. **Performance issues**: Check cache configuration and field count

### Debug Tools

```typescript
// Check registry status
import { getFieldRegistry } from '@/lib/field-registry';
const registry = getFieldRegistry();
console.log('Registry ready:', registry.isReady());
console.log('Performance metrics:', registry.getPerformanceMetrics());

// Check form generation
import { getDynamicFormGenerator } from '@/lib/form-generation-engine';
const generator = getDynamicFormGenerator();
const form = await generator.generateForm({ categoryId: 'test' });
console.log('Generated form:', form);
```

## API Reference

### Field Registry API

- `getField(key: string)`: Get field configuration by key
- `getFieldsForCategory(categoryId: string)`: Get fields for category
- `registerField(config: SpecificationFieldConfig)`: Register new field
- `updateField(key: string, updates: Partial<SpecificationFieldConfig>)`: Update field
- `removeField(key: string)`: Remove field

### Validation Engine API

- `validateField(config, value, context)`: Validate single field
- `validateForm(fields, values, categoryId)`: Validate entire form
- `registerCustomValidator(validator)`: Register custom validator

### Form Generator API

- `generateFormSchema(options)`: Generate form schema
- `createInitialFormState(fields, initialValues)`: Create initial state
- `handleFieldChange(state, fieldKey, value, fields)`: Handle field changes

## Best Practices

1. **Field Naming**: Use camelCase for field keys (e.g., 'wireGauge', 'lightType')
2. **Validation**: Always provide clear error messages
3. **Performance**: Use field groups to organize related fields
4. **Accessibility**: Ensure all fields have proper labels and descriptions
5. **Testing**: Write tests for custom validators and field configurations

## Migration Guide

### From Legacy System

1. Run migration script to create dynamic fields
2. Update components to use new dynamic form system
3. Test field configurations and validation
4. Update any custom field logic

### Adding New Field Types

1. Create field component in `src/components/dynamic-fields/`
2. Register component in UI Component Factory
3. Add validation logic if needed
4. Update TypeScript types
5. Add tests

## Support

For technical support or questions:

1. Check this documentation
2. Review error logs and debug output
3. Test with minimal field configurations
4. Check Sanity CMS for field configuration issues