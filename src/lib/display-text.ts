export const UNKNOWN_USER_LABEL = "Unknown User";

export function safeUserName(value: unknown, fallback = UNKNOWN_USER_LABEL) {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const sanitized = raw
    .replace(/[<>`]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || fallback;
}

export function safeInitial(value: unknown, fallback = "U") {
  return safeUserName(value, fallback).slice(0, 1).toUpperCase() || fallback;
}
