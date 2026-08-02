/**
 * WhatsApp phone-number normalization for Indian-first customer messaging.
 *
 * Every number that enters the messaging pipeline passes through
 * `normalizePhoneToE164` so the bot always receives a strict E.164 number
 * (`91XXXXXXXXXX`), never raw user input with spaces, dashes, brackets or
 * national prefixes. Invalid numbers are rejected here — with a stable reason —
 * before any delivery attempt, and callers log the failure with the customer id.
 */

export type PhoneNormalizationResult =
  | { ok: true; e164: string; national: string; input: string }
  | { ok: false; reason: PhoneRejectReason; input: string };

export type PhoneRejectReason =
  | "empty"
  | "too_short"
  | "too_long"
  | "not_digits"
  | "ambiguous_country_code"
  | "invalid";

/** Default country code applied to bare 10-digit national numbers (India). */
const DEFAULT_COUNTRY_CODE = "91";

/**
 * Normalize an Indian phone number to E.164 (`91XXXXXXXXXX`).
 *
 * Accepted inputs:
 *  - `9876543210`            (10-digit national)        -> 919876543210
 *  - `+91 98765 43210`       (country code + national)  -> 919876543210
 *  - `0091 98765 43210`      (dialing prefix)           -> 919876543210
 *  - `0 98765 43210`         (national prefix)          -> 919876543210
 *  - `(91) 98765-43210`      (punctuation stripped)     -> 919876543210
 *
 * Anything shorter than 10 digits, longer than 13, containing letters, or with a
 * country code that is not `91` is rejected so the message is never attempted.
 */
export function normalizePhoneToE164(input?: string | null): PhoneNormalizationResult {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, reason: "empty", input: raw };

  // Strip spaces, dashes, brackets, dots, slashes — everything except digits and
  // a single leading "+".
  if (!/^\+?[\d\s\-()./]+$/.test(raw)) {
    return { ok: false, reason: "not_digits", input: raw };
  }

  let digits = raw.replace(/[^\d]/g, "");
  const hadPlus = raw.startsWith("+");

  // Leading "00" international dialing prefix.
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Leading "0" national trunk prefix (0XXXXXXXXXX -> XXXXXXXXXX).
  if (digits.startsWith("0")) digits = digits.slice(1);

  let e164: string;
  if (digits.length === 10) {
    // Bare national number.
    e164 = `${DEFAULT_COUNTRY_CODE}${digits}`;
  } else if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    // Already 91XXXXXXXXXX.
    e164 = digits;
  } else if (digits.length === 12 && hadPlus) {
    // "+<code><national>" with a non-91 country code — ambiguous, reject rather
    // than guess wrong and deliver to a stranger.
    return { ok: false, reason: "ambiguous_country_code", input: raw };
  } else if (digits.length === 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    // "91" + 9-digit national — invalid national length.
    return { ok: false, reason: "invalid", input: raw };
  } else if (digits.length >= 10 && digits.length <= 13) {
    // 11 or 13 digits with an unknown/extra country code — cannot safely
    // determine the national part; reject instead of silently mangling.
    return { ok: false, reason: "ambiguous_country_code", input: raw };
  } else if (digits.length < 10) {
    return { ok: false, reason: "too_short", input: raw };
  } else {
    return { ok: false, reason: "too_long", input: raw };
  }

  const national = e164.slice(DEFAULT_COUNTRY_CODE.length);
  return { ok: true, e164, national, input: raw };
}

/** Build a neutral WhatsApp JID (`91XXXXXXXXXX@c.us`) from a phone number. */
export function phoneToJid(input?: string | null): string {
  const normalized = normalizePhoneToE164(input);
  return normalized.ok ? `${normalized.e164}@c.us` : "";
}

/** Short human label for a reject reason (for logs / dashboards). */
export function phoneRejectLabel(reason: PhoneRejectReason): string {
  switch (reason) {
    case "empty":
      return "No phone number";
    case "too_short":
      return "Phone number too short (min 10 digits)";
    case "too_long":
      return "Phone number too long (max 13 digits)";
    case "not_digits":
      return "Phone number contains invalid characters";
    case "ambiguous_country_code":
      return "Phone number has an unknown country code (only +91 supported)";
    case "invalid":
      return "Phone number is invalid";
    default:
      return "Invalid phone number";
  }
}
