const SCRIPT_TAG_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;
const EVENT_HANDLER_REGEX = /\son\w+\s*=/gi;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u2060\u2061\u2062\u2063\u2064\u00AD]/g;
const JAVASCRIPT_PROTO = /javascript\s*:/gi;
const VBSCRIPT_PROTO = /vbscript\s*:/gi;
const DATA_PROTO = /data\s*:/gi;
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

export function sanitizeString(input: string): string {
  return input
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(ZERO_WIDTH_CHARS, "")
    .replace(JAVASCRIPT_PROTO, "")
    .replace(VBSCRIPT_PROTO, "")
    .replace(DATA_PROTO, "")
    .trim();
}

export function sanitizeRegistrationInput(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeRegistrationInput(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
