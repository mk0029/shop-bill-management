import { NextResponse } from "next/server";
import { getServerAuth, type ServerAuth } from "@/lib/server-auth";
import { isAdminLike, isSuperAdmin } from "@/lib/rbac";
import { sanitizeString } from "@/lib/security/validation";

export type ApiHandler<T = unknown> = (params: {
  auth: ServerAuth;
  body: T;
  params: Record<string, string>;
  query: Record<string, string>;
}) => Promise<Response>;

export function requireAuth(handler: ApiHandler): (req: Request, context?: { params?: Record<string, string> }) => Promise<Response> {
  return async (req: Request, context?: { params?: Record<string, string> }) => {
    try {
      const auth = await getServerAuth();
      if (!auth.isAuthenticated) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      const body = req.method !== "GET" && req.method !== "HEAD"
        ? await req.json().catch(() => ({}))
        : {};
      const url = new URL(req.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { query[k] = v; });
      return handler({
        auth,
        body,
        params: context?.params || {},
        query,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  };
}

export function requireAdmin(handler: ApiHandler): (req: Request, context?: { params?: Record<string, string> }) => Promise<Response> {
  return requireAuth(async (ctx) => {
    if (!isAdminLike(ctx.auth.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }
    return handler(ctx);
  });
}

export function requireSuperAdmin(handler: ApiHandler): (req: Request, context?: { params?: Record<string, string> }) => Promise<Response> {
  return requireAuth(async (ctx) => {
    if (!isSuperAdmin(ctx.auth.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }
    return handler(ctx);
  });
}

export function sanitizeBody<T extends Record<string, unknown>>(body: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}
