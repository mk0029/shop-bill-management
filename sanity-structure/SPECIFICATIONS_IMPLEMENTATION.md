# Specifications Implementation Guide

## Overview

This document explains how the specification system is implemented in the Sanity Shop project, covering both the backend schema design and frontend integration. The specification system allows for dynamic, category-specific product attributes that can be easily managed and extended.

## Core Components

### 1. Schema Structure

The specification system consists of several interconnected schemas:

#### `specifications.js`

This is the base object schema that defines all possible specification fields a product can have. It's organized into categories:

- **Electrical specifications**: voltage, wattage, amperage, loadCapacity, wireGauge
- **Light specifications**: lightType, color, lumens
- **Physical properties**: size, weight, material
- **Product-specific fields**: modal, modular
- **Warranty information**: hasWarranty, warrantyMonths
- **Certifications**: certifications (array of strings)

#### `specificationOption.js`

This document schema defines predefined options for specification fields. Each option includes:

- `type`: The specification type (e.g., 'amperage', 'voltage', 'wireGauge')
- `value`: Internal system value (e.g., '6A', '220V', '1.5mm')
- `label`: Display label shown to users
- `categories`: References to applicable product categories
- `sortOrder`: Controls display order in dropdowns
- `isActive`: Toggle to enable/disable options
- `description`: Optional description

#### `categoryFieldMapping.js`

This document schema maps which specification fields are required or optional for each product category:

- `category`: Reference to a product category
- `categoryType`: Classification of the category (e.g., 'ampere', 'volt-watt', 'wire', 'light', 'general')
- `requiredFields`: Array of references to field definitions that are mandatory for this category
- `optionalFields`: Array of references to field definitions that are optional for this category
- `isActive`: Toggle to enable/disable the mapping
- `description`: Optional description

#### `fieldDefinition.js`

This document schema defines individual fields that can be used in products:

- `fieldKey`: Internal field identifier (camelCase)
- `fieldLabel`: Display label shown to users
- `fieldType`: Type of field (text, number, select, multiselect, etc.)
- `description`: Help text for users
- `placeholder`: Placeholder text for input fields
- `validationRules`: Object containing validation rules
- `defaultValue`: Default value for the field
- `sortOrder`: Controls display order in forms
- `isActive`: Toggle to enable/disable the field
- `applicableCategories`: Categories where this field can be used
- `conditionalLogic`: Rules for showing/hiding the field based on other field values

### 2. Integration with Products

The `product.js` schema includes a `specifications` field of type 'specifications', which allows products to store their specific attribute values. This creates a flexible system where:

1. Each product category has its own set of required and optional fields
2. Fields are populated with predefined options from the specification options
3. The UI can dynamically adjust based on the selected category

## Data Migration

The project includes migration scripts to populate the specification system:

### `migrate-specifications-to-sanity.js`

This script:

1. Creates product categories
2. Creates specification options with references to applicable categories
3. Creates category field mappings with references to categories

The script includes templates for:

- **Specification options**: Predefined values for amperage, voltage, wire gauge, light type, and color
- **Category field mappings**: Defines which fields are required or optional for each category

## Sanity Studio Integration

The specification system is integrated into the Sanity Studio through the desk structure:

```javascript
// Specifications Management Section
S.listItem()
  .title('Specifications Management')
  .child(
    S.list()
      .title('Specifications')
      .items([
        S.listItem()
          .title('Specification Options')
          .schemaType('specificationOption')
          .child(S.documentTypeList('specificationOption').title('Specification Options')),
        S.listItem()
          .title('Category Field Mappings')
          .schemaType('categoryFieldMapping')
          .child(S.documentTypeList('categoryFieldMapping').title('Category Field Mappings')),
      ])
  )
```

This creates a dedicated section in the studio for managing specifications.

## Frontend Implementation

In the frontend application, the specification system enables:

1. **Dynamic Product Forms**: When creating or editing products, the form can dynamically show or hide fields based on the selected category
2. **Filtered Options**: Dropdown options can be filtered to only show values applicable to the current product category
3. **Validation**: Field validation can be applied based on the rules defined in the field definitions
4. **Conditional Display**: Fields can be shown or hidden based on the values of other fields

## Best Practices

### Adding New Specification Types

1. Add the new field to the `specifications.js` schema
2. Create specification options in the Sanity Studio
3. Update category field mappings to include the new field where appropriate

### Category-Specific Forms

When implementing product forms in the frontend:

1. Fetch the category field mapping for the selected category
2. Dynamically render form fields based on required and optional fields
3. Populate dropdowns with options from the specification options filtered by category
4. Apply validation rules from field definitions

### Extending the System

The specification system is designed to be extensible:

- New specification types can be added to `specifications.js`
- New field types can be added to the field definition options
- New validation rules can be added to the validation rules object
- Conditional logic can be extended to support more complex scenarios

## Conclusion

The specification system provides a flexible and powerful way to manage product attributes in the Sanity Shop project. By separating the definition of fields, options, and category mappings, it enables a dynamic and extensible approach to product data management.