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
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ success: true });
    }

    const token = process.env.CHAT_SYNC_TOKEN || process.env.CHAT_BACKEND_JWT_SECRET || process.env.JWT_SECRET || "";
    if (!token) {
      return NextResponse.json({ success: true });
    }

    const baseUrl = notificationBackendUrl();
    await fetch(`${baseUrl}/internal/session/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
