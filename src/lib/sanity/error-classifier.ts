/**
 * Error Classifier — Categorizes errors for failover decisions.
 *
 * Not all errors should trigger failover:
 *   - Network/timeout/rate-limit → safe to retry on another DB
 *   - Auth/config errors → need human attention, don't silently failover
 */

import type { ErrorCategory } from "./types";

/**
 * Classify an error into an ErrorCategory.
 * Examines error message, status codes, and common patterns.
 */
export function classifyError(error: unknown): ErrorCategory {
  const msg = getErrorMessage(error).toLowerCase();
  const status = getHttpStatusCode(error);

  // HTTP status codes
  const statusCategory = getStatusCategory(status);
  if (statusCategory) return statusCategory;

  // Message-based classification
  if (containsAny(msg, ["unauthorized", "forbidden", "permission denied", "token", "401", "403"]))
    return "AUTH_ERROR";
  if (containsAny(msg, ["not found", "404", "does not exist"]))
    return "NOT_FOUND";
  if (containsAny(msg, ["rate limit", "429", "too many requests", "throttl"]))
    return "RATE_LIMIT";
  if (containsAny(msg, ["timeout", "etimedout", "esockettimedout", "abort", "timed out"]))
    return "TIMEOUT";
  if (containsAny(msg, ["network", "enotfound", "econnrefused", "econnreset", "fetch failed", "dns"]))
    return "NETWORK_ERROR";
  if (containsAny(msg, ["disabled", "project not found", "dataset not found"]))
    return "PROJECT_DISABLED";
  if (containsAny(msg, ["invalid", "malformed", "missing field", "validation"]))
    return "INVALID_INPUT";
  if (containsAny(msg, ["sanity api", "groq", "mutation failed"]))
    return "SANITY_API_ERROR";

  return "UNKNOWN";
}

/**
 * Determine whether an error is safe to retry/failover on.
 * Auth and config errors should NOT trigger failover.
 */
export function isRetryable(category: ErrorCategory): boolean {
  switch (category) {
    case "NETWORK_ERROR":
    case "TIMEOUT":
    case "RATE_LIMIT":
    case "SANITY_API_ERROR":
    case "UNKNOWN":
      return true;
    case "AUTH_ERROR":
    case "CONFIG_ERROR":
    case "PROJECT_DISABLED":
    case "NOT_FOUND":
    case "INVALID_INPUT":
      return false;
  }
}

/**
 * Get a human-readable description of an error category.
 */
export function describeErrorCategory(category: ErrorCategory): string {
  switch (category) {
    case "NETWORK_ERROR": return "Network connectivity issue";
    case "TIMEOUT": return "Request timed out";
    case "RATE_LIMIT": return "Sanity API rate limit exceeded";
    case "AUTH_ERROR": return "Authentication/authorization failure";
    case "CONFIG_ERROR": return "Configuration error";
    case "NOT_FOUND": return "Document or resource not found";
    case "PROJECT_DISABLED": return "Sanity project is disabled or unavailable";
    case "INVALID_INPUT": return "Invalid input or validation error";
    case "SANITY_API_ERROR": return "Sanity API error";
    case "UNKNOWN": return "Unknown error";
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

function getHttpStatusCode(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.status === "number") return e.status;
    // @sanity/client sometimes puts it in response
    if (e.response && typeof e.response === "object") {
      const resp = e.response as Record<string, unknown>;
      if (typeof resp.statusCode === "number") return resp.statusCode;
      if (typeof resp.status === "number") return resp.status;
    }
  }
  return null;
}

function getStatusCategory(status: number | null): ErrorCategory | null {
  if (status === null) return null;
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "SANITY_API_ERROR";
  return null;
}

function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}
