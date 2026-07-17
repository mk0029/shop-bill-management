import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import { sendFcmToTokens } from "@/services/notifications/fcm-sender.server";

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-notify-secret, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function resolveAudienceUserIds(audience: string): Promise<string[]> {
  if (audience === "admins") {
    return sanityClient.fetch<string[]>(
      `*[_type=="user" && role in ["admin","super_admin","technician"] && isActive != false]._id`,
    );
  }
  if (audience === "customers") {
    return sanityClient.fetch<string[]>(
      `*[_type=="user" && role == "customer" && isActive != false]._id`,
    );
  }
  return sanityClient.fetch<string[]>(
    `*[_type=="user" && isActive != false]._id`,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.title || !body?.body) {
      return NextResponse.json(
        { success: false, error: "Missing title/body" },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    const title = String(body.title || "").trim();
    const msgBody = String(body.body || "").trim();
    if (!title || !msgBody) {
      return NextResponse.json(
        { success: false, error: "Missing title/body" },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    const audience = String(body.audience || "all");
    const explicitUserIds: string[] = Array.isArray(body.userIds) ? body.userIds : body.userId ? [body.userId] : [];
    const excludeUserIds: string[] = Array.isArray(body.excludeUserIds) ? body.excludeUserIds : [];
    const excludeTokens: string[] = Array.isArray(body.excludeTokens) ? body.excludeTokens : [];

    const targetUserIds = explicitUserIds.length > 0
      ? explicitUserIds.filter((id: string) => !excludeUserIds.includes(id))
      : (await resolveAudienceUserIds(audience)).filter((id: string) => !excludeUserIds.includes(id));

    if (!targetUserIds.length) {
      return NextResponse.json(
        { success: false, error: "No target users found" },
        { status: 404, headers: corsHeaders(req) },
      );
    }

    let tokens = await getActiveTokenStringsForUsers(targetUserIds);
    if (excludeTokens.length > 0) {
      const excluded = new Set(excludeTokens);
      tokens = tokens.filter((t) => !excluded.has(t));
    }

    if (!tokens.length) {
      return NextResponse.json(
        { success: false, error: "No FCM tokens for target users" },
        { status: 404, headers: corsHeaders(req) },
      );
    }

    const data: Record<string, string> = {};
    if (body.data && typeof body.data === "object") {
      for (const [k, v] of Object.entries(body.data)) {
        data[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }
    if (body.eventType || body.type) data.event = String(body.eventType || body.type);

    const result = await sendFcmToTokens({ tokens, title, body: msgBody, data });
    return NextResponse.json({ ...result }, { status: result.success ? 200 : 500, headers: corsHeaders(req) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders(req) });
  }
}
