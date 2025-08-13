# Dynamic Specification Fields - User Guide

## Overview

The Dynamic Specification Fields system allows you to easily manage product specifications without requiring technical knowledge. You can add new specification fields, organize them into categories, and customize how they appear in forms.

## Getting Started

### What are Dynamic Specification Fields?

Dynamic specification fields are customizable form fields that automatically appear when adding or editing products based on the selected category. For example:

- **Electrical products** show fields like watts, voltage, and amperage
- **Wire products** show fields like wire gauge, core type, and insulation
- **Lighting products** show fields like lumens, light type, and color temperature

### Key Benefits

- **No coding required**: Add new fields through the admin interface
- **Automatic organization**: Fields are grouped by category and type
- **Smart validation**: Built-in validation ensures data quality
- **Consistent experience**: Same fields appear across all forms

## Using Dynamic Fields

### Adding Products with Dynamic Fields

1. **Navigate to Add Product**
   - Go to Admin → Inventory → Add Product

2. **Select Category**
   - Choose your product category from the dropdown
   - Specification fields will automatically appear based on your selection

3. **Fill in Specifications**
   - Required fields are marked with a red asterisk (*)
   - Optional fields can be left empty
   - Hover over field labels for help text

4. **Validation**
   - Fields are validated as you type
   - Error messages appear in red below invalid fields
   - Warning messages appear in yellow for potential issues

### Field Types

The system supports various field types:

#### Text Fields
- **Single-line text**: For short descriptions, model numbers
- **Multi-line text**: For longer descriptions, notes
- **Email**: For contact information with email validation
- **URL**: For website links with URL validation

#### Number Fields
- **Number**: For measurements, quantities, ratings
- **Range**: For selecting values within a specific range

#### Selection Fields
- **Dropdown**: Choose one option from a list
- **Multi-select**: Choose multiple options from a list
- **Boolean**: Yes/No, True/False, or checkbox options

#### Date Fields
- **Date picker**: For warranty dates, manufacturing dates

### Common Specification Fields

#### Electrical Specifications
- **Watts**: Power consumption (0.1W to 2000W)
- **Voltage**: Operating voltage (12V, 220V, 415V, etc.)
- **Amperage**: Current rating (6A, 16A, 32A, etc.)
- **Frequency**: Electrical frequency (50Hz, 60Hz)

#### Physical Properties
- **Color**: Product color (White, Black, Red, etc.)
- **Size**: Physical dimensions or size category
- **Material**: Construction material (Plastic, Metal, Ceramic, etc.)
- **Weight**: Product weight

#### Wire & Cable Specifications
- **Wire Gauge**: Thickness in square millimeters (1.5, 2.5, 4.0, etc.)
- **Core Type**: Single, Multi, or Stranded core
- **Insulation**: PVC, XLPE, or Rubber insulation

#### Lighting Specifications
- **Light Type**: LED, CFL, Incandescent, Halogen
- **Lumens**: Light output (800, 1200, 1600, etc.)
- **Color Temperature**: Warm White, Cool White, Daylight

### Field Validation

#### Required Fields
- Fields marked with (*) must be filled
- Form cannot be submitted until all required fields are complete

#### Number Validation
- **Watts**: Must be between 0.1W and 2000W
- **Voltage**: Must be a valid voltage rating
- **Wire Gauge**: Must be a standard wire gauge size

#### Text Validation
- **Email**: Must be a valid email format
- **URL**: Must be a valid web address
- **Length**: Text fields have minimum and maximum length limits

#### Warning Messages
- High wattage values (>1000W) show warnings for verification
- Unusual combinations may trigger warning messages

### Using Existing Product Selection

When adding inventory for existing products:

1. **Select Existing Product**
   - Use the "Select Existing Product" dropdown at the top of the form
   - Search by product name or brand

2. **Auto-filled Fields**
   - All specification fields are automatically filled
   - Only purchase price, selling price, and stock quantity remain editable
   - Other fields are disabled to maintain consistency

3. **Adding Stock**
   - Enter the new stock quantity you're adding
   - Purchase and selling prices can be updated if needed

## Field Organization

### Field Groups

Specification fields are organized into logical groups:

#### Electrical Specifications
- Power-related fields (watts, voltage, amperage)
- Frequency and phase information
- Electrical ratings and certifications

#### Physical Properties
- Size, color, and material specifications
- Weight and dimension information
- Physical characteristics

#### Category-Specific Groups
- **Lighting**: Light type, lumens, color temperature
- **Wire & Cable**: Gauge, core type, insulation
- **Motors**: Horsepower, RPM, phase information

### Conditional Fields

Some fields appear only when certain conditions are met:

- **Lumens** field appears only for LED and CFL light types
- **Wire gauge** appears only for wire and cable categories
- **Horsepower** appears only for motor categories

## Tips for Best Results

### Data Entry Tips

1. **Be Consistent**
   - Use the same format for similar products
   - Follow the suggested options when available

2. **Use Standard Values**
   - Select from dropdown options when possible
   - Standard values ensure better search and filtering

3. **Provide Complete Information**
   - Fill in all relevant fields for better product identification
   - More complete data improves search results

### Common Mistakes to Avoid

1. **Mixing Units**
   - Don't mix different units (e.g., watts and horsepower)
   - Use the unit specified in the field label

2. **Incomplete Required Fields**
   - Always fill required fields marked with (*)
   - Check for validation errors before submitting

3. **Inconsistent Naming**
   - Use standard color names (White, not Off-white)
   - Follow standard specifications (220V, not 220 volts)

## Troubleshooting

### Common Issues

#### Fields Not Appearing
- **Check category selection**: Ensure you've selected a category
- **Refresh the page**: Sometimes fields need a moment to load
- **Contact admin**: Category might not have fields configured

#### Validation Errors
- **Read error messages**: They provide specific guidance
- **Check required fields**: Look for red asterisks (*)
- **Verify number ranges**: Ensure values are within valid ranges

#### Form Not Submitting
- **Check for errors**: Look for red error messages
- **Complete required fields**: All (*) fields must be filled
- **Wait for validation**: Let the form finish validating

### Getting Help

If you encounter issues:

1. **Check field help text**: Hover over field labels for guidance
2. **Review validation messages**: Error messages provide specific instructions
3. **Contact system administrator**: For field configuration issues
4. **Check this guide**: Reference common solutions above

## Frequently Asked Questions

### Q: Can I add custom specification fields?
A: Contact your system administrator to add new fields. They can configure new fields through the admin interface.

### Q: Why don't I see certain fields for my category?
A: Fields are configured per category. If you need additional fields, contact your administrator.

### Q: Can I change field values after saving?
A: Yes, you can edit products and update specification values. Go to the product list and click edit.

### Q: What happens if I enter invalid data?
A: The system will show validation errors and prevent saving until corrected.

### Q: How do I know which fields are required?
A: Required fields are marked with a red asterisk (*) next to the field label.

### Q: Can I copy specifications from another product?
A: Yes, use the "Select Existing Product" feature to auto-fill specifications from similar products.

## Best Practices

### For Inventory Managers

1. **Standardize Data Entry**
   - Train staff on consistent data entry practices
   - Use standard terminology and values
   - Regular review of product specifications

2. **Quality Control**
   - Review new product entries for completeness
   - Verify technical specifications with suppliers
   - Maintain consistent naming conventions

3. **Organization**
   - Use appropriate categories for products
   - Fill in all relevant specification fields
   - Keep product information up to date

### For System Administrators

1. **Field Configuration**
   - Regularly review and update field options
   - Add new fields as product lines expand
   - Maintain field validation rules

2. **User Training**
   - Provide training on new field types
   - Document company-specific standards
   - Regular refresher training sessions

3. **Data Quality**
   - Monitor data entry quality
   - Set up validation rules for common errors
   - Regular data cleanup and standardization

## Updates and Changes

The dynamic fields system is regularly updated with new features and improvements. Key areas of ongoing development:

- New field types and validation options
- Enhanced user interface and experience
- Better integration with other system components
- Improved performance and reliability

Stay informed about updates through system notifications and administrator communications.