import { NextRequest, NextResponse } from "next/server";

function notificationBackendUrl() {
  const raw =
    process.env.SHOP_CHAT_URL ||
    process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
    "https://shop-chat-backend.onrender.com/";
  return raw.replace(/\/+$/, "");
}

async function callBackend(path: string, body: Record<string, unknown>) {
  const baseUrl = notificationBackendUrl();
  const token = process.env.CHAT_SYNC_TOKEN || process.env.CHAT_BACKEND_JWT_SECRET || process.env.JWT_SECRET || "";
  if (!token) return null;

  return fetch(`${baseUrl}/internal${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
    .then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => ({})) }))
    .catch(() => null);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, userId, deviceId, deviceName, browser, os } = body;
    if (!sessionId || !userId) {
      return NextResponse.json({ success: false, error: "Missing sessionId/userId" }, { status: 400 });
    }

    // Create the new session
    const createResult = await callBackend("/session/create", {
      sessionId, userId, deviceId, deviceName, browser, os,
    });

    // Replace any existing active sessions for this user (excluding the new one)
    await callBackend("/session/replace", {
      userId,
      newSessionId: sessionId,
      newDeviceName: deviceName || "another device",
    });

    return NextResponse.json({
      success: true,
      sessionCreated: createResult?.ok ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
