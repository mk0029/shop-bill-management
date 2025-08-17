import { fetchCategoryFieldMapping } from "./sanity-queries";
import { sanityClient } from "@/lib/sanity";

// Interface for validation rules
interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  customErrorMessage?: string;
}

// Interface for field definition
interface FieldDefinition {
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  validationRules?: ValidationRules;
}

// Dynamic validation based on category field mappings
export const validateProduct = async (formData: Record<string, any>) => {
  const errors: Record<string, string> = {};

  // Validate required fields
  if (!formData.category) {
    errors.category = "Category is required";
  }
  
  if (!formData.productName) {
    errors.productName = "Product name is required";
  } else if (formData.productName.length < 3) {
    errors.productName = "Product name must be at least 3 characters long";
  } else if (formData.productName.length > 100) {
    errors.productName = "Product name cannot exceed 100 characters";
  }

  if (Object.keys(errors).length > 0) {
    return errors;
  }

  try {
    // The category field might be an ID, so we need to get the category name
    let categoryName = formData.category;

    // If the category looks like an ID (starts with alphanumeric), fetch the category name
    if (categoryName && categoryName.length > 10) {
      try {
        const categoryQuery = `*[_type == "category" && _id == "${categoryName}"][0] { name }`;
        const categoryResult = await sanityClient.fetch(categoryQuery);
        if (categoryResult && categoryResult.name) {
          categoryName = categoryResult.name.toLowerCase();
        }
      } catch (error) {
        console.warn("Could not fetch category name, using as-is:", error);
      }
    }

    // Fetch field requirements for this category
    const fieldMapping = await fetchCategoryFieldMapping(categoryName);

    if (fieldMapping) {
      // Check required fields
      fieldMapping.requiredFields?.forEach((fieldKey: string) => {
        const fieldValue = formData[fieldKey];

        if (!fieldValue || fieldValue.toString().trim() === "") {
          const fieldLabels: Record<string, string> = {
            amperage: "Amperage",
            voltage: "Voltage",
            watts: "Watts",
            wireGauge: "Wire Gauge",
            core: "Core Type",
            lightType: "Light Type",
            color: "Color",
            size: "Size",
            material: "Material",
          };

          errors[fieldKey] = `${
            fieldLabels[fieldKey] || fieldKey
          } is required for ${fieldMapping.categoryName}`;
        } else {
          // Apply field-specific validation rules
          const validationErrors = validateFieldValue(fieldValue, {
            fieldKey,
            fieldLabel: fieldKey,
            fieldType: "text", // Default type
          });
          if (validationErrors.length > 0) {
            errors[fieldKey] = validationErrors[0];
          }
        }
      });

      // Check optional fields if they have values
      fieldMapping.optionalFields?.forEach((fieldKey: string) => {
        const fieldValue = formData[fieldKey];

        if (fieldValue && fieldValue.toString().trim() !== "") {
          const validationErrors = validateFieldValue(fieldValue, {
            fieldKey,
            fieldLabel: fieldKey,
            fieldType: "text", // Default type
          });
          if (validationErrors.length > 0) {
            errors[fieldKey] = validationErrors[0];
          }
        }
      });
    }
  } catch (error) {
    console.error("Error validating product:", error);
  }

  return errors;
};

// Helper function to validate individual field values
export const validateFieldValue = (
  value: any,
  fieldDefinition: FieldDefinition
) => {
  const errors: string[] = [];
  const rules = fieldDefinition.validationRules || {};

  // Convert value to string for length checks
  const stringValue = value?.toString() || "";

  // Check minimum length
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(
      `${fieldDefinition.fieldLabel} must be at least ${rules.minLength} characters`
    );
  }

  // Check maximum length
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(
      `${fieldDefinition.fieldLabel} must be no more than ${rules.maxLength} characters`
    );
  }

  // Check minimum value (for numbers)
  if (rules.minValue && parseFloat(stringValue) < rules.minValue) {
    errors.push(
      `${fieldDefinition.fieldLabel} must be at least ${rules.minValue}`
    );
  }

  // Check maximum value (for numbers)
  if (rules.maxValue && parseFloat(stringValue) > rules.maxValue) {
    errors.push(
      `${fieldDefinition.fieldLabel} must be no more than ${rules.maxValue}`
    );
  }

  // Check regex pattern
  if (rules.pattern && !new RegExp(rules.pattern).test(stringValue)) {
    errors.push(
      rules.customErrorMessage ||
        `${fieldDefinition.fieldLabel} format is invalid`
    );
  }

  // Special validation for watts
  if (fieldDefinition.fieldKey === "watts") {
    const wattsValue = parseFloat(stringValue);
    if (isNaN(wattsValue) || wattsValue <= 0) {
      errors.push("Please enter a valid watts value");
    }
    if (wattsValue > 2000) {
      errors.push("Watts cannot exceed 2000W");
    }
  }

  return errors;
};

// Validate specific field types
export const validateFieldByType = (
  value: any,
  fieldType: string,
  fieldLabel: string
) => {
  const errors: string[] = [];

  switch (fieldType) {
    case "number":
      if (value && isNaN(parseFloat(value))) {
        errors.push(`${fieldLabel} must be a valid number`);
      }
      break;

    case "email":
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${fieldLabel} must be a valid email address`);
      }
      break;

    case "url":
      if (value) {
        try {
          new URL(value);
        } catch {
          errors.push(`${fieldLabel} must be a valid URL`);
        }
      }
      break;

    default:
      // No specific validation for other types
      break;
  }

  return errors;
};
