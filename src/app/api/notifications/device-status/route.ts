import { NextRequest, NextResponse } from "next/server";
import { getDeviceSessionStatus } from "@/lib/fcm/tokens.server";

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
    const local = body?.userId && body?.deviceId
      ? await getDeviceSessionStatus({
          userId: String(body.userId),
          deviceId: String(body.deviceId),
        }).catch((error) => ({
          success: false,
          error: error instanceof Error ? error.message : "Local device status failed",
        }))
      : null;
    if (local?.success && local.known !== false) {
      return NextResponse.json(local);
    }
    if (local?.success && local.known === false) {
      return NextResponse.json(local);
    }

    const response = await fetch(`${notificationBackendUrl()}/notifications/device-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (local?.success && result?.known === false) {
      return NextResponse.json(local);
    }
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
