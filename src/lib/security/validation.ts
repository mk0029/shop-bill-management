const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[1-9][0-9]{7,14}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

export function validateEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function validatePhone(phone: unknown): phone is string {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return PHONE_REGEX.test(cleaned);
}

export function validateUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return UUID_REGEX.test(value);
}

export function validateObjectId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return OBJECT_ID_REGEX.test(value);
}

export function validateDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return DATE_REGEX.test(value) && !isNaN(Date.parse(value));
}

export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return `${fieldName} cannot be empty`;
  }
  return null;
}

export function validateStringLength(
  value: unknown,
  fieldName: string,
  min = 0,
  max = Infinity,
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (value.length > max) {
    return `${fieldName} must be at most ${max} characters`;
  }
  return null;
}

export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min = -Infinity,
  max = Infinity,
): string | null {
  if (typeof value !== "number" || isNaN(value)) {
    return `${fieldName} must be a valid number`;
  }
  if (value < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (value > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return null;
}

const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_TAG_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const EVENT_HANDLER_REGEX = /\son\w+\s*=/gi;

export function sanitizeString(input: string): string {
  let sanitized = input
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(/[<>]/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .trim();
  return sanitized;
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : item && typeof item === "object"
            ? sanitizeObject(item as Record<string, unknown>)
            : item,
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): { valid: true; value: T } | { valid: false; error: string } {
  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    };
  }
  return { valid: true, value: value as T };
}
