import { NextRequest, NextResponse } from "next/server";
import { registerFcmToken } from "@/lib/fcm/tokens.server";

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
    const local = await registerFcmToken(body);
    const backend = await fetch(`${notificationBackendUrl()}/notifications/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify(body),
    })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        result: await response.json().catch(() => ({})),
      }))
      .catch((error) => ({
        ok: false,
        status: 0,
        result: { error: error instanceof Error ? error.message : "Backend registration failed" },
      }));
    return NextResponse.json({
      success: true,
      data: local,
      backendRegistered: backend.ok && backend.result?.success !== false,
      ...(backend.ok ? {} : { backendError: backend.result?.error || "Backend registration failed" }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
