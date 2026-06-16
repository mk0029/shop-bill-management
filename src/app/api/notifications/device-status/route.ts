import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { resolveUserId } from "@/lib/fcm/tokens.server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const deviceId = String(body?.deviceId || "").trim();
    if (!userId || !deviceId) {
      return NextResponse.json({ success: false, error: "Missing userId/deviceId" }, { status: 400 });
    }

    const resolvedUserId = await resolveUserId(userId);

    const current = await sanityClient.fetch<{
      _id: string;
      isActive?: boolean;
      deviceName?: string;
      deactivatedReason?: string;
      replacedByDeviceName?: string;
      lastLoginAt?: string;
    } | null>(
      `coalesce(
        *[_type=="userFcmToken" && userId==$userId && deviceId==$deviceId && isActive == true] | order(updatedAt desc)[0],
        *[_type=="userFcmToken" && userId==$userId && deviceId==$deviceId] | order(updatedAt desc)[0]
      ){
        _id,
        isActive,
        deviceName,
        deactivatedReason,
        replacedByDeviceName,
        lastLoginAt
      }`,
      { userId: resolvedUserId, deviceId },
    );

    if (!current) {
      return NextResponse.json({
        success: true,
        active: true,
        known: false,
      });
    }

    return NextResponse.json({
      success: true,
      known: true,
      active: current.deactivatedReason === "FCM_TOKEN_REFRESH" ? true : current.isActive !== false,
      reason: current.deactivatedReason,
      loggedInOn: current.replacedByDeviceName,
      deviceName: current.deviceName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
