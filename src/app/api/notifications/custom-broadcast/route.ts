import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { sendNotificationEvent } from "@/services/notifications/notification-events.server";

type BroadcastAudience = "customers" | "admins" | "all";

function canSend(role: string | null) {
  return role === "admin" || role === "super_admin";
}

function cleanText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function audienceRoles(audience: BroadcastAudience) {
  if (audience === "customers") return ["customer"];
  if (audience === "admins") return ["admin", "super_admin", "technician"];
  return ["customer", "admin", "super_admin", "technician"];
}

async function getTargetUserIds(audience: BroadcastAudience) {
  const roles = audienceRoles(audience);
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role in $roles && isActive != false]._id`,
    { roles },
  );
  return Array.from(new Set((ids || []).map(String).filter(Boolean)));
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || !canSend(auth.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const audience = String(body?.audience || "customers") as BroadcastAudience;
    if (!["customers", "admins", "all"].includes(audience)) {
      return NextResponse.json(
        { success: false, error: "Invalid audience" },
        { status: 400 },
      );
    }

    const title = cleanText(body?.title, 90);
    const message = cleanText(body?.message || body?.body, 500);
    const link = cleanText(body?.link, 220);
    const category = cleanText(body?.category, 50) || "special_offer";
    const expiresInHours = Math.max(
      1,
      Math.min(168, Number(body?.expiresInHours || 24) || 24),
    );

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and message are required" },
        { status: 400 },
      );
    }

    const targetUserIds = await getTargetUserIds(audience);
    if (!targetUserIds.length) {
      return NextResponse.json(
        { success: false, error: "No active users found for this audience" },
        { status: 404 },
      );
    }

    const actorUserId = String(auth.userId || "").trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString();
    const eventId = `custom.${category}.${audience}.${now.toISOString().slice(0, 19)}`.replace(
      /[^a-zA-Z0-9_.-]/g,
      "-",
    );

    const result = await sendNotificationEvent({
      eventId,
      type: "system.general",
      actorUserId,
      userIds: targetUserIds,
      title,
      body: message,
      data: {
        category,
        audience,
        expiresAt,
        route: link || undefined,
        route_path: link || undefined,
      },
      skipActor: true,
    });

    return NextResponse.json(
      {
        success: result.ok,
        targetCount: result.targetUserIds.length,
        notificationId: result.notificationId,
        send: result.send,
        error: result.error,
      },
      { status: result.ok ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
