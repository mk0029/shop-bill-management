import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  detectMaliciousPayload,
  detectMaliciousHeaders,
  INVALID_METHODS,
  checkRateLimit,
  RATE_LIMIT_CONFIGS,
  getRateLimitKey,
  SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY,
  corsHeaders,
  isOriginAllowed,
} from "@/lib/security";

const LOGIN_PATHS = new Set(["/api/auth/login", "/api/auth/me"]);
const BILL_CREATE_PATHS = [/^\/api\/mutations\/bills\/create/, /^\/api\/bills/];
const SEARCH_PATHS = [/^\/api\/users\/search/, /^\/api\/customers\/search/];
const PUBLIC_PATHS = [
  "/api/ping",
  "/api/health",
  "/api/offers",
  "/api/offers/active",
];
const UPLOAD_PATHS = [/^\/api\/upload\//];
const WHATSAPP_PATHS = [/^\/api\/whatsapp\//];

const MAX_BODY_SIZE = 10 * 1024 * 1024;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p)) return true;
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function logBlock(req: NextRequest, reason: string, status: number) {
  const url = req.nextUrl.pathname + req.nextUrl.search;
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "firewall_blocked",
      timestamp: new Date().toISOString(),
      ip,
      method: req.method,
      url,
      reason,
      status,
      ua: ua.slice(0, 200),
    }),
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const response = NextResponse.next();

  if (method === "OPTIONS") {
    const headers = corsHeaders(request);
    return new NextResponse(null, { status: 204, headers });
  }

  if (method === "HEAD") {
    return new NextResponse(null, { status: 204 });
  }

  const headers: Record<string, string> = {};
  if (method) headers["user-agent"] = request.headers.get("user-agent") || "";
  if (method) headers["referer"] = request.headers.get("referer") || "";
  if (method) headers["x-forwarded-for"] =
    request.headers.get("x-forwarded-for") || "";
  const headerThreat = detectMaliciousHeaders(headers);
  if (headerThreat) {
    logBlock(request, `headers:${headerThreat}`, 403);
    return NextResponse.json(
      { error: "Request blocked by security policy" },
      { status: 403, headers: SECURITY_HEADERS },
    );
  }

  if (isApiPath(pathname) && !isPublicPath(pathname)) {
    if (INVALID_METHODS.has(method)) {
      logBlock(request, `invalid_method:${method}`, 405);
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405, headers: SECURITY_HEADERS },
      );
    }
  }

  if (isApiPath(pathname) && ["POST", "PUT", "PATCH"].includes(method)) {
    const cl = request.headers.get("content-length");
    if (cl) {
      const size = parseInt(cl, 10);
      if (size > MAX_BODY_SIZE) {
        logBlock(request, "payload_too_large", 413);
        return NextResponse.json(
          { error: "Request body too large" },
          { status: 413, headers: SECURITY_HEADERS },
        );
      }
    }

    if (
      pathname.includes("/upload/") &&
      request.headers.get("content-type")?.includes("multipart/form-data")
    ) {
      // File uploads have different body handling
    } else {
      try {
        const cloned = request.clone();
        const text = await cloned.text();
        if (text) {
          if (text.length > MAX_BODY_SIZE) {
            logBlock(request, "payload_too_large", 413);
            return NextResponse.json(
              { error: "Request body too large" },
              { status: 413, headers: SECURITY_HEADERS },
            );
          }
          const threat = detectMaliciousPayload(text);
          if (threat) {
            logBlock(request, `body:${threat}`, 400);
            return NextResponse.json(
              { error: "Request blocked by security policy" },
              { status: 400, headers: SECURITY_HEADERS },
            );
          }
        }
      } catch {
        // Ignore body parsing errors - route handler will catch them
      }
    }
  }

  const queryString = request.nextUrl.search;
  if (queryString) {
    const threat = detectMaliciousPayload(queryString);
    if (threat) {
      logBlock(request, `query:${threat}`, 400);
      return NextResponse.json(
        { error: "Request blocked by security policy" },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }
  }
  for (const [, value] of request.nextUrl.searchParams.entries()) {
    const threat = detectMaliciousPayload(value);
    if (threat) {
      logBlock(request, `query_param:${threat}`, 400);
      return NextResponse.json(
        { error: "Request blocked by security policy" },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }
  }

  if (isApiPath(pathname)) {
    let identifier = getRateLimitKey(request);

    if (BILL_CREATE_PATHS.some((p) => p.test(pathname)) && method === "POST") {
      const result = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.BILL_CREATE);
      if (!result.allowed) {
        logBlock(request, "rate_limit:bill_create", 429);
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              ...SECURITY_HEADERS,
              "Retry-After": String(result.retryAfter || 1),
              "X-RateLimit-Remaining": "0",
            },
          },
        );
      }
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    }

    if (SEARCH_PATHS.some((p) => p.test(pathname))) {
      const result = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.SEARCH);
      if (!result.allowed) {
        logBlock(request, "rate_limit:search", 429);
        return NextResponse.json(
          { error: "Too many search requests. Please slow down." },
          {
            status: 429,
            headers: {
              ...SECURITY_HEADERS,
              "Retry-After": String(result.retryAfter || 1),
            },
          },
        );
      }
    }

    if (UPLOAD_PATHS.some((p) => p.test(pathname))) {
      const result = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.UPLOAD);
      if (!result.allowed) {
        logBlock(request, "rate_limit:upload", 429);
        return NextResponse.json(
          { error: "Too many upload requests. Please slow down." },
          { status: 429, headers: SECURITY_HEADERS },
        );
      }
    }

    if (WHATSAPP_PATHS.some((p) => p.test(pathname))) {
      const result = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.WHATSAPP);
      if (!result.allowed) {
        logBlock(request, "rate_limit:whatsapp", 429);
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          { status: 429, headers: SECURITY_HEADERS },
        );
      }
    }

    if (!isPublicPath(pathname)) {
      const result = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.API);
      if (!result.allowed) {
        logBlock(request, "rate_limit:api", 429);
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              ...SECURITY_HEADERS,
              "Retry-After": String(result.retryAfter || 1),
            },
          },
        );
      }
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    }
  }

  const chatUrl = (process.env.NEXT_PUBLIC_SHOP_CHAT_URL || "https://shop-chat-backend.onrender.com").replace(/\/+$/, "");
  const chatOrigin = (() => { try { return new URL(chatUrl).origin; } catch { return "https://shop-chat-backend.onrender.com"; } })();
  const cspConnectSrc = `connect-src 'self' ws://localhost:* wss://*.render.com https://*.supabase.co https://*.sanity.io https://*.firebaseio.com https://api.razorpay.com https://idji8ni7.api.sanity.io ${chatOrigin}`;
  const csp = CONTENT_SECURITY_POLICY.replace(/connect-src[^;]+/, cspConnectSrc);
  response.headers.set("Content-Security-Policy", csp);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
