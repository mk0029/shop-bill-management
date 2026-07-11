import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { detectMaliciousPayload } from "@/lib/security/waf";
import { isOriginAllowed, corsHeaders, SECURITY_HEADERS } from "@/lib/security/headers";
import {
  validateRegistration,
  sanitizeRegistrationInput,
  REGISTRATION_TOKEN_EXPIRY_MS,
  MAX_PAYLOAD_SIZE,
} from "@/lib/customer-registration";
import { normalizeAndValidate } from "@/lib/phone-utils";
import { checkDuplicates } from "@/lib/customer-registration/duplicate-checker";
import { generateRequestId, generateDeviceToken } from "@/lib/customer-registration/token-service";
import { checkIdentityRateLimit } from "@/lib/security/identity-rate-limiter";
import { sendNotificationToAdmins } from "@/services/notifications/notification-events.server";

function errorResponse(code: string, message: string, status: number, errors?: Record<string, string[]>) {
  return NextResponse.json(
    { success: false, code, message, ...(errors ? { errors } : {}) },
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
    const method = request.method;

    if (!origin || !isOriginAllowed(origin)) {
      return errorResponse("ORIGIN_BLOCKED", "Request origin is not allowed", 403);
    }

    if (method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
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

    const result = validateRegistration(sanitized);
    if (!result.success) {
      return errorResponse("VALIDATION_ERROR", "Validation failed", 400, result.errors);
    }

    const { name, phone, email, location, requestType, deviceFingerprint } = result.data!;
    const canonicalPhone = normalizeAndValidate(phone);

    const identityLimit = checkIdentityRateLimit(
      { email, phone, ip: clientIp },
      "registration",
    )
    if (!identityLimit.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        "For your security, we've temporarily limited requests for this account due to multiple unsuccessful attempts. Please wait a few minutes before trying again, or contact support if you believe this is an error.",
        429,
      )
    }
    if (!canonicalPhone) {
      return errorResponse("VALIDATION_ERROR", "Invalid phone number", 400);
    }

    const duplicate = await checkDuplicates(email, canonicalPhone);
    if (duplicate.type === "ACCOUNT_EXISTS") {
      return errorResponse("ACCOUNT_EXISTS", "An account with this email address or mobile number already exists.", 409);
    }
    if (duplicate.type === "REQUEST_EXISTS") {
      return errorResponse("REQUEST_EXISTS", "We have already received a registration request using this email address or mobile number.", 409);
    }

    const requestId = generateRequestId();
    const deviceToken = generateDeviceToken(requestId);
    const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_EXPIRY_MS).toISOString();
    const now = new Date().toISOString();

    try {
      await sanityClient.create({
        _type: "customerRequest",
        requestId,
        name,
        phone,
        normalizedPhone: canonicalPhone,
        email,
        location,
        requestType,
        status: "pending",
        deviceFingerprint: deviceFingerprint || undefined,
        ipAddress: clientIp,
        submittedAt: now,
        expiresAt,
        createdAt: now,
      });
    } catch (sanityError) {
      console.error("Sanity create failed:", sanityError);
      return errorResponse("SERVER_ERROR", "Failed to submit registration request. Please try again.", 500);
    }

    sendNotificationToAdmins({
      type: "customer.request.created",
      eventId: `customer.request.created.${requestId}`,
      title: "New Customer Registration Request",
      body: `${name} has submitted a new registration request.`,
      data: {
        route: "/admin/customers",
        requestId,
        entityId: requestId,
        customerName: name,
      },
    }).catch((e) => console.error("[Register] FCM notification failed:", e));

    return successResponse("Your registration request has been submitted successfully.", {
      requestId,
      token: deviceToken,
      expiresAt,
    });
  } catch (error) {
    console.error("Registration API error:", error);
    return errorResponse("SERVER_ERROR", "An unexpected error occurred. Please try again later.", 500);
  }
}

export const dynamic = "force-dynamic";
