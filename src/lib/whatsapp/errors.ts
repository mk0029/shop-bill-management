/**
 * WhatsApp delivery error classification.
 *
 * The queue only retries *transient* failures (network blips, bot reconnecting,
 * rate limits). Permanent failures (invalid phone, number not registered on
 * WhatsApp, permanently invalid chat id) are marked `retryable: false` so they
 * land in `failed` immediately with an explicit reason — never a silent drop.
 */

export type WaErrorCode =
  | "INVALID_PHONE"
  | "NUMBER_NOT_ON_WHATSAPP"
  | "INVALID_CHAT_ID"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_ACTIVE"
  | "ENGINE_NOT_READY"
  | "NETWORK_ERROR"
  | "NETWORK_TIMEOUT"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "PAYLOAD_TOO_LARGE"
  | "BOT_UNREACHABLE"
  | "BOT_NOT_CONFIGURED"
  | "SEND_FAILED"
  | "UNKNOWN";

export interface ClassifiedWaError {
  code: WaErrorCode;
  /** True only when an exponential-backoff retry can succeed. */
  retryable: boolean;
  /** Stable, human-readable reason stored on the message log. */
  reason: string;
  httpStatus?: number;
}

const PERMANENT_CODES = new Set<WaErrorCode>([
  "INVALID_PHONE",
  "NUMBER_NOT_ON_WHATSAPP",
  "INVALID_CHAT_ID",
  "UNAUTHORIZED",
  "PAYLOAD_TOO_LARGE",
  "BOT_NOT_CONFIGURED",
]);

export function isRetryable(code: WaErrorCode): boolean {
  return !PERMANENT_CODES.has(code);
}

/** Classify an HTTP response from the bot. */
export function classifyHttpResponse(status: number, body: { errorCode?: string; message?: string }): ClassifiedWaError {
  const errorCode = String(body?.errorCode || "").toUpperCase();
  const message = String(body?.message || "");

  switch (status) {
    case 401:
    case 403:
      return { code: "UNAUTHORIZED", retryable: false, reason: message || "Bot API authorization failed", httpStatus: status };
    case 404:
      return {
        code: errorCode === "ENGINE_NOT_READY" ? "ENGINE_NOT_READY" : "SESSION_NOT_FOUND",
        retryable: errorCode === "ENGINE_NOT_READY",
        reason: message || "Session or endpoint not found on the bot",
        httpStatus: status,
      };
    case 409:
      return { code: "ENGINE_NOT_READY", retryable: true, reason: message || "WhatsApp client is reconnecting", httpStatus: status };
    case 422:
      return {
        code: "NUMBER_NOT_ON_WHATSAPP",
        retryable: false,
        reason: message || "Number is not on WhatsApp",
        httpStatus: status,
      };
    case 429:
      return { code: "RATE_LIMITED", retryable: true, reason: message || "WhatsApp rate limit reached", httpStatus: status };
    case 413:
      return { code: "PAYLOAD_TOO_LARGE", retryable: false, reason: message || "Message too large", httpStatus: status };
    case 400:
      return {
        code: errorCode === "INVALID_CHAT_ID" ? "INVALID_CHAT_ID" : errorCode === "NUMBER_NOT_ON_WHATSAPP" ? "NUMBER_NOT_ON_WHATSAPP" : "SEND_FAILED",
        retryable: false,
        reason: message || "The bot rejected the message (permanent)",
        httpStatus: status,
      };
    default:
      if (status >= 500) {
        return { code: "SEND_FAILED", retryable: true, reason: message || `Bot error (${status})`, httpStatus: status };
      }
      return { code: "SEND_FAILED", retryable: false, reason: message || `Unexpected bot response (${status})`, httpStatus: status };
  }
}

/** Classify a thrown/network-level failure (fetch rejection, timeout, ...). */
export function classifyThrownError(error: unknown): ClassifiedWaError {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (
    lower.includes("not configured") ||
    lower.includes("invalid phone") ||
    lower.includes("phone is required")
  ) {
    return { code: "BOT_NOT_CONFIGURED", retryable: false, reason: message };
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("eai_again") ||
    lower.includes("network")
  ) {
    return { code: "BOT_UNREACHABLE", retryable: true, reason: `WhatsApp bot unreachable: ${message}` };
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted")
  ) {
    return { code: "NETWORK_TIMEOUT", retryable: true, reason: `Send timed out: ${message}` };
  }
  return { code: "UNKNOWN", retryable: true, reason: message || "Unknown failure" };
}

/**
 * Final classifier for a completed send attempt. `body` comes from the bot's
 * structured error response (errorCode + retryable), which the openwa client
 * passes through verbatim.
 */
export function classifySendFailure(input: {
  httpStatus?: number;
  body?: { errorCode?: string; retryable?: boolean; message?: string };
  thrown?: unknown;
}): ClassifiedWaError {
  if (input.thrown) return classifyThrownError(input.thrown);

  const explicit = input.body;
  const explicitCode = String(explicit?.errorCode || "").toUpperCase();

  // Honor the bot's own retryable verdict when it provides one.
  if (explicitCode && explicit?.retryable !== undefined && explicit?.retryable !== null) {
    return {
      code: (explicitCode as WaErrorCode) || "SEND_FAILED",
      retryable: Boolean(explicit.retryable),
      reason: explicit.message || `Bot error ${explicitCode}`,
      httpStatus: input.httpStatus,
    };
  }

  if (input.httpStatus != null) return classifyHttpResponse(input.httpStatus, explicit || {});
  return classifyThrownError(input.thrown);
}
