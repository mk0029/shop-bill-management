import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

const STATUSES = new Set(["queued", "sent", "delivered", "opened", "failed"]);

function cleanId(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("notification.") ? raw : `notification.${raw}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = cleanId(body?.notificationId || body?.id);
    const status = String(body?.status || "").trim();

    if (!notificationId || !STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid notification status update" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    await sanityClient
      .patch(notificationId)
      .set({
        deliveryStatus: status,
        updatedAt: now,
        ...(status === "delivered" ? { deliveredAt: now } : {}),
        ...(status === "opened" ? { openedAt: now } : {}),
      })
      .setIfMissing({ statusHistory: [] })
      .append("statusHistory", [
        {
          _key: `${status}.${Date.now()}`,
          status,
          at: now,
          source: "service-worker",
        },
      ])
      .commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
