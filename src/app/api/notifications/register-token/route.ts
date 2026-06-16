import { NextRequest, NextResponse } from "next/server";

function notificationBackendUrl() {
  const raw =
    process.env.SHOP_CHAT_URL ||
    process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
    "https://shop-chat-backend.onrender.com/";
  return raw.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.token || !body?.userId) {
      return NextResponse.json({ success: false, error: "Missing token/userId" }, { status: 400 });
    }
    const response = await fetch(`${notificationBackendUrl()}/notifications/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
