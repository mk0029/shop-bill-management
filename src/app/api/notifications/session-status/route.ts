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
    const { userId, deviceId, sessionId } = body;
    if (!userId || !deviceId || !sessionId) {
      return NextResponse.json({ success: false, error: "Missing userId/deviceId/sessionId" }, { status: 400 });
    }

    const token = process.env.CHAT_SYNC_TOKEN || process.env.CHAT_BACKEND_JWT_SECRET || process.env.JWT_SECRET || "";

    const response = await fetch(`${notificationBackendUrl()}/internal/session/status?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json().catch(() => ({}));
    if (!result?.ok) {
      return NextResponse.json({ success: true, sessionKnown: false, sessionStatus: "unknown" });
    }

    const known = result.known === true;
    const isReplaced = known && result.status === "replaced";

    return NextResponse.json({
      success: true,
      sessionKnown: known,
      sessionStatus: result.status || "unknown",
      lastSeenSessionId: sessionId,
      replacedByDeviceName: result.deviceName || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
