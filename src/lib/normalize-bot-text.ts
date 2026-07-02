/**
 * Safe text normalizer for WhatsApp Bot dashboard.
 * Handles null/undefined, Date objects, mojibake repair, and long values.
 */

const MAX_LENGTH = 500;

/**
 * Detect mojibake patterns. These are the byte sequences that appear when
 * UTF-8 text is decoded as Latin-1/Windows-1252 and then re-encoded as UTF-8.
 * We match on the raw string bytes, not on Unicode code points.
 */
function hasMojibake(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0xc3) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (
        (next >= 0x80 && next <= 0xbf) ||
        next === 0x82 ||
        next === 0x83 ||
        next === 0x85 ||
        next === 0x86 ||
        next === 0x89 ||
        next === 0x9f ||
        next === 0xa2 ||
        next === 0xa3
      ) {
        return true;
      }
    }
  }
  if (text.includes("\ufffd")) return true;
  return false;
}

/**
 * Map known broken byte sequences to their intended characters.
 * Keys are the actual corrupted strings stored in the source/file.
 */
const BROKEN: Array<[string, string]> = [
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u008c\u00a6\u00c2\u00a8\u00c3\u0082\u00c2\u00a2", "\u2713"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u008c\u00a6\u00c2\u00a8\u201c\u00c3\u0082\u00c2\u00a2", "\u2717"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u008c\u00a6\u00c2\u00a1\u00c3\u0082\u00e2\u0080\u00a0\u00c2\u00a0", "\u26a0 "],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u008c\u00a6\u00c2\u00a1\u00c3\u0082\u00e2\u0080\u00a0", "\u26a0"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u00ac\u00a1\u00c2\u00a0\u00c3\u0082\u00c2\u00a2", "\u2192 "],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u00ac\u00a1\u00c2\u00a0", "\u2192"],
  ["\u00c3\u0082\u00e2\u0080\u00a2\u00c3\u0082\u00c2\u00a6\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a1", "\u2022"],
  ["\u00c3\u0082\u00e2\u0080\u00a2", "\u2022"],
  ["\u00c3\u0082\u00e2\u0080\u0094\u00c3\u0082\u00c2\u00a0", "\u2014 "],
  ["\u00c3\u0082\u00e2\u0080\u0094", "\u2014"],
  ["\u00c3\u0082\u00e2\u0080\u0093", "\u2013"],
  ["\u00c3\u0082\u00e2\u0080\u0099", "\u2019"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a1\u00c3\u0082\u00c2\u00a6", "\u2026"],
  ["\u00c3\u0083\u00c2\u00b0\u00c3\u00a2\u00e2\u0080\u009a\u00c3\u0082\u00c2\u00b1", "\ud83d\udd11"],
  ["\u00c3\u0082\u00e2\u0080\u0098", "\u2018"],
  ["\u00c3\u0082\u00e2\u0080\u009c", "\u201c"],
  ["\u00c3\u0082\u00e2\u0080\u009d", "\u201d"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a1\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a6", "\u2014\u2014"],
  ["\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a1\u00c3\u0082\u00e2\u0080\u00a1", "\u2193"],
];

/**
 * Try to repair a mojibake string using known mapping and UTF-8/Latin1 decode.
 */
function tryRepairMojibake(text: string): string {
  let result = text;
  for (const [broken, fixed] of BROKEN) {
    while (result.includes(broken)) {
      result = result.replace(broken, fixed);
    }
  }
  if (hasMojibake(result)) {
    try {
      const bytes = new Uint8Array(
        Array.from(result).map((ch) => ch.charCodeAt(0) & 0xff),
      );
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (decoded && !decoded.includes("\ufffd")) {
        result = decoded;
      }
    } catch {
      // repair failed, keep result as-is
    }
  }
  return result;
}

/**
 * Normalize any value to a clean display string.
 * - null/undefined -> fallback (default: "\u2014")
 * - Date objects -> readable locale string
 * - Objects -> JSON.stringify
 * - Mojibake strings -> repaired text
 * - Long values -> truncated with ellipsis
 */
export function normalizeBotText(
  value: unknown,
  fallback: string = "\u2014",
  maxLen: number = MAX_LENGTH,
): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) {
    try {
      return value.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return fallback;
    }
  }
  if (typeof value === "object") {
    try {
      value = JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  let text = String(value).trim();
  if (!text) return fallback;
  if (hasMojibake(text)) {
    const repaired = tryRepairMojibake(text);
    if (repaired !== text) text = repaired;
  }
  if (text.length > maxLen) {
    text = text.slice(0, maxLen) + "\u2026";
  }
  return text;
}
