import { NextRequest, NextResponse } from "next/server";

function chatBackendUrl() {
  const raw =
    process.env.SHOP_CHAT_URL ||
    process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
    "https://shop-chat-backend.onrender.com/";
  return raw.replace(/\/+$/, "");
}

export async function POST(_req: NextRequest) {
  try {
    const response = await fetch(`${chatBackendUrl()}/notifications/bill-reminder/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
