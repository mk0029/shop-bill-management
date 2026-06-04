import { NextRequest, NextResponse } from "next/server";
import { registerUserDeviceSession } from "@/lib/fcm/tokens.server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const deviceInfo = body?.deviceInfo && typeof body.deviceInfo === "object" ? body.deviceInfo : undefined;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }
    if (!deviceInfo?.deviceId) {
      return NextResponse.json({ success: false, error: "Missing deviceId" }, { status: 400 });
    }

    const data = await registerUserDeviceSession({ userId, deviceInfo });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: message === "User not found" ? 404 : 500 });
  }
}
