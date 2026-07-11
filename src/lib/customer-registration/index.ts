export {
  validateRegistration,
  validateRecovery,
  normalizePhone,
  isDisposableEmail,
} from "./validation";
export type { ValidationResult } from "./validation";

export { sanitizeRegistrationInput, sanitizeString } from "./sanitizer";

export {
  getDeviceFingerprint,
  getStoredRegistration,
  storeRegistration,
  clearStoredRegistration,
} from "./device-fingerprint";
export type { DeviceStorage } from "./device-fingerprint";

export {
  REGISTRATION_TOKEN_EXPIRY_MS,
  MAX_PAYLOAD_SIZE,
  STORAGE_KEY,
} from "./types";
export type {
  RegistrationRequest,
  RegistrationResponse,
  ErrorResponse,
  RecoveryRequest,
  DuplicateCheckResult,
} from "./types";
