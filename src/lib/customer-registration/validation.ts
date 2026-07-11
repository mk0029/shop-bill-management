import { z } from "zod";
import { DISPOSABLE_DOMAINS } from "./types";
import { normalizePhone as normalizePhoneBase } from "@/lib/phone-utils";

const nameRegex = /^[a-zA-Z\s\-'.]+$/;
const phoneRegex = /^[6-9]\d{9}$/;
const locationRegex = /^[a-zA-Z\s\-'.,/#]+$/;

export const registrationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(nameRegex, "Name contains invalid characters")
    .transform((v) => v.trim().replace(/\s+/g, " ")),
  phone: z
    .string()
    .regex(phoneRegex, "Enter a valid 10-digit Indian mobile number starting with 6-9"),
  email: z
    .string()
    .email("Enter a valid email address")
    .max(254, "Email address is too long")
    .transform((v) => v.trim().toLowerCase()),
  location: z
    .string()
    .min(2, "Location is required")
    .max(200, "Location is too long")
    .regex(locationRegex, "Location contains invalid characters")
    .transform((v) => v.trim().replace(/\s+/g, " ")),
  requestType: z
    .string()
    .min(1, "Request type is required")
    .max(200, "Request type is too long")
    .transform((v) => v.trim().replace(/\s+/g, " ")),
  deviceFingerprint: z.string().max(512).optional().or(z.literal("")),
});

export const recoverySchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or phone number is required")
    .max(254, "Identifier is too long")
    .transform((v) => v.trim()),
});

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function normalizePhone(phone: string): string {
  const normalized = normalizePhoneBase(phone)
  if (normalized.length === 10) return `+91${normalized}`
  return normalized
}

export type ValidationResult = {
  success: boolean;
  data?: z.infer<typeof registrationSchema>;
  errors?: Record<string, string[]>;
};

export function validateRegistration(
  input: unknown,
): ValidationResult {
  const result = registrationSchema.safeParse(input);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return { success: false, errors };
  }

  if (isDisposableEmail(result.data.email)) {
    return {
      success: false,
      errors: { email: ["Temporary email addresses are not allowed"] },
    };
  }

  return { success: true, data: result.data };
}

export function validateRecovery(
  input: unknown,
): { success: boolean; data?: { identifier: string; type: "email" | "phone" }; errors?: Record<string, string[]> } {
  const result = recoverySchema.safeParse(input);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return { success: false, errors };
  }

  const cleaned = result.data.identifier;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
  const isPhone = /^[6-9]\d{9}$/.test(cleaned.replace(/\D/g, ""));

  if (!isEmail && !isPhone) {
    return {
      success: false,
      errors: { identifier: ["Enter a valid email address or 10-digit mobile number"] },
    };
  }

  return {
    success: true,
    data: {
      identifier: isPhone ? normalizePhone(cleaned) : cleaned.toLowerCase(),
      type: isPhone ? "phone" : "email",
    },
  };
}
