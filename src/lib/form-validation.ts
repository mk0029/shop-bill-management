import { BillFormData } from "@/types";

// Generic validation types
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Generic field validator
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName: string
): string | null {
  if (
    rules.required &&
    (!value || (typeof value === "string" && !value.trim()))
  ) {
    return `${fieldName} is required`;
  }

  if (value && typeof value === "string") {
    if (rules.minLength && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${fieldName} must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

// Bill form validation
export function validateBillForm(formData: BillFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Customer validation
  if (!formData.customerId) {
    errors.customerId = "Please select a customer";
  }

  // Items validation
  if (!formData.items || formData.items.length === 0) {
    errors.items = "Please add at least one item";
  }

  // Individual item validation
  formData.items.forEach((item, index) => {
    if (item.quantity <= 0) {
      errors[`item_${index}_quantity`] = "Quantity must be greater than 0";
    }
    if (item.price <= 0) {
      errors[`item_${index}_price`] = "Price must be greater than 0";
    }
  });

  // Service type validation
  if (!formData.serviceType) {
    errors.serviceType = "Please select a service type";
  }

  // Location type validation
  if (!formData.locationType) {
    errors.locationType = "Please select a location type";
  }

  // Notes validation (optional but with length limit)
  if (formData.notes && formData.notes.length > 500) {
    errors.notes = "Notes must be no more than 500 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Customer form validation
export function validateCustomerForm(customerData: {
  name: string;
  phone: string;
  location: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const nameError = validateField(
    customerData.name,
    {
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    "Name"
  );
  if (nameError) errors.name = nameError;

  const phoneError = validateField(
    customerData.phone,
    {
      required: true,
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
    },
    "Phone"
  );
  if (phoneError) errors.phone = phoneError;

  const locationError = validateField(
    customerData.location,
    {
      required: true,
      minLength: 3,
      maxLength: 200,
    },
    "Location"
  );
  if (locationError) errors.location = locationError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Generic form validator
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, ValidationRule>
): ValidationResult {
  const errors: Record<string, string> = {};

  Object.entries(rules).forEach(([field, rule]) => {
    const error = validateField(data[field], rule, field);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
