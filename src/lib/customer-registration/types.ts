export interface RegistrationRequest {
  name: string;
  phone: string;
  email: string;
  location: string;
  company?: string;
  deviceFingerprint?: string;
}

export interface RegistrationResponse {
  success: true;
  message: string;
  requestId: string;
  token: string;
  expiresAt: string;
}

export interface ErrorResponse {
  success: false;
  code: "VALIDATION_ERROR" | "ACCOUNT_EXISTS" | "REQUEST_EXISTS" | "DUPLICATE_IDENTITY" | "RATE_LIMITED" | "PAYLOAD_TOO_LARGE" | "CSRF_FAILED" | "ORIGIN_BLOCKED" | "SERVER_ERROR" | "RECOVERY_INVALID" | "RECOVERY_RATE_LIMITED";
  message: string;
  errors?: Record<string, string[]>;
}

export interface RecoveryRequest {
  identifier: string;
}

export interface DeviceStorage {
  requestId: string;
  token: string;
  timestamp: number;
  expiresAt: number;
}

export interface DuplicateCheckResult {
  type: "OK" | "ACCOUNT_EXISTS" | "REQUEST_EXISTS";
  detail?: string;
}

export const REGISTRATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
export const MAX_PAYLOAD_SIZE = 10_240;
export const RATE_LIMIT_REGISTRATION = { windowMs: 600_000, max: 3 };
export const RATE_LIMIT_RECOVERY = { windowMs: 3600_000, max: 3 };
export const STORAGE_KEY = "pending_registration";

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "tempmail.com", "throwaway.com", "yopmail.com", "trashmail.com",
  "sharklasers.com", "grr.la", "maildrop.cc", "getnada.com",
  "temp-mail.org", "fakeinbox.com", "mailtemp.net", "dispostable.com",
  "spamgourmet.com", "mytemp.email", "tempemail.net", "mailcatch.com",
  "burnermail.io", "inboxbear.com",
]);
