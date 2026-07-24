import { NextResponse } from "next/server";
import { detectMaliciousPayload } from "@/lib/security/waf";
import { isOriginAllowed, SECURITY_HEADERS } from "@/lib/security/headers";
import {
  validateRecovery,
  sanitizeRegistrationInput,
  MAX_PAYLOAD_SIZE,
} from "@/lib/customer-registration";
import { processRecovery } from "@/lib/customer-registration/credential-recovery";
import { checkIdentityRateLimit } from "@/lib/security/identity-rate-limiter";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, code, message },
    { status, headers: SECURITY_HEADERS },
  );
}

function successResponse(message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { success: true, message, ...extra },
    { status: 200, headers: { ...SECURITY_HEADERS, "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || !isOriginAllowed(origin)) {
      return errorResponse("ORIGIN_BLOCKED", "Request origin is not allowed", 403);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorResponse("VALIDATION_ERROR", "Content-Type must be application/json", 415);
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return errorResponse("PAYLOAD_TOO_LARGE", "Request body too large", 413);
    }

    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return errorResponse("SERVER_ERROR", "Failed to read request body", 400);
    }

    if (!bodyText || bodyText.length > MAX_PAYLOAD_SIZE) {
      return errorResponse("PAYLOAD_TOO_LARGE", "Request body too large", 413);
    }

    const threat = detectMaliciousPayload(bodyText);
    if (threat) {
      return errorResponse("VALIDATION_ERROR", "Request blocked by security policy", 400);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return errorResponse("VALIDATION_ERROR", "Invalid JSON in request body", 400);
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return errorResponse("VALIDATION_ERROR", "Request body must be a JSON object", 400);
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded?.split(",")[0]?.trim() || "127.0.0.1";

    const sanitized = sanitizeRegistrationInput(parsed);
    const validation = validateRecovery(sanitized);
    if (!validation.success) {
      return errorResponse("VALIDATION_ERROR", "Validation failed", 400);
    }

    const { identifier, type } = validation.data!;

    const recoveryLimit = checkIdentityRateLimit(
      { [type === "email" ? "email" : "phone"]: identifier, ip: clientIp },
      "recovery",
    )
    if (!recoveryLimit.allowed) {
      return errorResponse(
        "RECOVERY_RATE_LIMITED",
        "For your security, we've temporarily limited requests for this account due to multiple unsuccessful attempts. Please wait a few minutes before trying again, or contact support if you believe this is an error.",
        429,
      )
    }

    const result = await processRecovery(identifier, type);

    if (!result.found) {
      if (result.pendingRequest) {
        return errorResponse(
          "REQUEST_PENDING",
          "Your registration request is still pending approval. Please wait for our team to review it, or contact support for assistance.",
          404,
        );
      }
      return errorResponse(
        "USER_NOT_FOUND",
        "No account found with that email address or mobile number. Please check your information and try again.",
        404,
      );
    }

    if (result.disabled) {
      return errorResponse(
        "ACCOUNT_DISABLED",
        "Your account has been disabled. Please contact support for assistance.",
        403,
      );
    }

    if (!result.sent) {
      return errorResponse(
        "DELIVERY_FAILED",
        "We found your account but could not deliver the credentials. Please try again or contact support.",
        500,
      );
    }

    return successResponse("Your login credentials have been sent successfully.", {
      methods: result.methods,
    });
  } catch (error) {
    console.error("Recovery API error:", error);
    return errorResponse("SERVER_ERROR", "An unexpected error occurred. Please try again later.", 500);
  }
}

export const dynamic = "force-dynamic";
