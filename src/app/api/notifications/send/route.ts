import { NextRequest, NextResponse } from "next/server";

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

function notificationBackendUrl() {
  const raw =
    process.env.SHOP_CHAT_URL ||
    process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
    "https://shop-chat-backend.onrender.com/";
  return raw.replace(/\/+$/, "");
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

    const response = await fetch(`${notificationBackendUrl()}/notifications/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify({
        ...body,
        eventType: body.eventType || body.type || "system.general",
      }),
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status, headers: corsHeaders(req) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders(req) });
  }
}
