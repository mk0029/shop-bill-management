export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(self), display-capture=(), clipboard-write=(self)",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://checkout.razorpay.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://cdn.sanity.io https://*.googleapis.com https://*.gstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' data: blob: ws://localhost:* wss://*.render.com wss://*.onrender.com https://*.supabase.co https://*.sanity.io https://*.firebaseio.com https://fcmregistrations.googleapis.com https://cdn.jsdelivr.net https://api.razorpay.com https://idji8ni7.api.sanity.io",
  "frame-src 'self' https://checkout.razorpay.com",
  "media-src 'self' data: blob: https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "block-all-mixed-content",
  "upgrade-insecure-requests",
].join("; ");

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://jambh-ell.vercel.app",
];

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, "");
  return ALLOWED_ORIGINS.some(
    (allowed) => allowed === normalized || normalized.startsWith(allowed),
  );
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Shop-Auth, x-user-id, x-notify-secret, x-api-key, X-CSRF-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
