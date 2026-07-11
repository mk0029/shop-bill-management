/**
 * Normalize any Indian mobile number to canonical 10-digit format.
 * Strips all non-digits, removes country code (+91 / 91), returns last 10 digits.
 *
 * Examples:
 *   "+917015493276" -> "7015493276"
 *   "91 70154 93276" -> "7015493276"
 *   "70154-93276" -> "7015493276"
 *   "7015493276" -> "7015493276"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length > 10) return digits.slice(-10)
  return digits
}

/**
 * Validate a normalized Indian mobile number.
 * Must be exactly 10 digits starting with 6, 7, 8, or 9.
 */
export function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone)
}

/**
 * Normalize and validate in one call.
 * Returns the normalized phone if valid, or null if invalid.
 */
export function normalizeAndValidate(phone: string): string | null {
  const normalized = normalizePhone(phone)
  if (!validatePhone(normalized)) return null
  return normalized
}

/**
 * Format a phone number for display: "+91 XXXXX XXXXX"
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.length !== 10) return phone
  return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`
}

/**
 * Generate possible format variants of a phone number for backward-compatible
 * database queries against the raw `phone` field.
 */
export function getPhoneFormats(phone: string): string[] {
  const digits = normalizePhone(phone)
  const formats: string[] = []
  if (digits.length === 10) {
    formats.push(digits)
    formats.push(`+91${digits}`)
    formats.push(`91${digits}`)
    formats.push(`+91-${digits.slice(0, 5)}-${digits.slice(5)}`)
    formats.push(`+91 ${digits.slice(0, 5)} ${digits.slice(5)}`)
    formats.push(`91 ${digits.slice(0, 5)} ${digits.slice(5)}`)
    formats.push(`${digits.slice(0, 5)}-${digits.slice(5)}`)
    formats.push(`${digits.slice(0, 5)} ${digits.slice(5)}`)
  }
  return [...new Set(formats)]
}
