import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { createAndDispatchNotification } from "@/services/notifications/notification-events.server";

type BroadcastAudience = "customers" | "admins" | "all";

function canSend(role: string | null) {
  return role === "admin" || role === "super_admin";
}

function cleanText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function isFutureDate(value: string) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > Date.now() + 30_000;
}

function notificationBackendUrl() {
  const raw =
    process.env.SHOP_CHAT_URL ||
    process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
    "https://shop-chat-backend.onrender.com/";
  return raw.replace(/\/+$/, "");
}

async function sendBackendBroadcast(input: {
  eventId: string;
  actorUserId: string;
  userIds: string[];
  audience: BroadcastAudience;
  title: string;
  body: string;
  data: Record<string, unknown>;
}) {
  try {
    const response = await fetch(`${notificationBackendUrl()}/notifications/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CHAT_SYNC_TOKEN ? { "x-notify-secret": process.env.CHAT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify({
        eventId: input.eventId,
        eventType: "system.general",
        actorUserId: input.actorUserId,
        userIds: input.userIds,
        audience: input.audience,
        title: input.title,
        body: input.body,
        data: input.data,
      }),
    });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok && result?.success !== false, status: response.status, result };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      result: { error: error instanceof Error ? error.message : "Backend notification send failed" },
    };
  }
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

export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    const configuredSecret = process.env.NOTIFICATIONS_CRON_SECRET || process.env.CRON_SECRET;
    if (configuredSecret) {
      if (secret !== configuredSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
    } else {
      const auth = await getServerAuth();
      if (!auth.isAuthenticated || !canSend(auth.role)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const campaigns = await sanityClient.fetch<Array<{
      _id: string;
      title?: string;
      description?: string;
      audience?: BroadcastAudience;
      category?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaUrl?: string;
      expiresAt?: string;
      targetUserIds?: string[];
      createdBy?: { _ref?: string };
    }>>(
      `*[_type=="notificationCampaign" && status=="queued" && scheduledAt <= $now][0...20]{
        _id,title,description,audience,category,imageUrl,ctaLabel,ctaUrl,expiresAt,targetUserIds,createdBy
      }`,
      { now },
    );

    const results: Array<{
      campaignId: string;
      success: boolean;
      notificationId?: string;
    }> = [];
    for (const campaign of campaigns || []) {
      const targetUserIds = Array.isArray(campaign.targetUserIds) && campaign.targetUserIds.length
        ? campaign.targetUserIds
        : await getTargetUserIds(campaign.audience || "customers");
      const notificationData = {
        category: campaign.category || "special_offer",
        audience: campaign.audience || "customers",
        expiresAt: campaign.expiresAt,
        imageUrl: campaign.imageUrl,
        ctaLabel: campaign.ctaLabel,
        ctaUrl: campaign.ctaUrl,
        route: campaign.ctaUrl || undefined,
        route_path: campaign.ctaUrl || undefined,
      };
      const result = await createAndDispatchNotification({
        eventId: `campaign.${campaign._id}`,
        type: "system.general",
        actorUserId: campaign.createdBy?._ref || "",
        userIds: targetUserIds,
        title: String(campaign.title || "Offer"),
        body: String(campaign.description || ""),
        data: notificationData,
        skipActor: false,
      });
      const sent = Number(result.send?.sent || 0);
      if (sent < targetUserIds.length) {
        await sendBackendBroadcast({
          eventId: `campaign.${campaign._id}`,
          actorUserId: campaign.createdBy?._ref || "",
          userIds: targetUserIds,
          audience: campaign.audience || "customers",
          title: String(campaign.title || "Offer"),
          body: String(campaign.description || ""),
          data: notificationData,
        });
      }
      await sanityClient
        .patch(campaign._id)
        .set({
          status: result.ok ? "sent" : "failed",
          notificationId: result.notificationId,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(result.error ? { error: result.error } : {}),
        })
        .commit();
      results.push({ campaignId: campaign._id, success: result.ok, notificationId: result.notificationId });
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
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
    const message = cleanText(body?.message || body?.body || body?.description, 500);
    const imageUrl = cleanText(body?.imageUrl || body?.image, 500);
    const ctaLabel = cleanText(body?.ctaLabel, 80);
    const ctaUrl = cleanText(body?.ctaUrl || body?.link, 220);
    const link = ctaUrl || cleanText(body?.link, 220);
    const category = cleanText(body?.category, 50) || "special_offer";
    const scheduledAt = cleanText(body?.scheduledAt, 80);
    const expiryDate = cleanText(body?.expiryDate || body?.expiresAt, 80);
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
    const expiresAt = expiryDate && !Number.isNaN(new Date(expiryDate).getTime())
      ? new Date(expiryDate).toISOString()
      : new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString();
    const eventId = `custom.${category}.${audience}.${now.toISOString().slice(0, 19)}`.replace(
      /[^a-zA-Z0-9_.-]/g,
      "-",
    );

    if (isFutureDate(scheduledAt)) {
      const campaign = await sanityClient.create({
        _type: "notificationCampaign",
        title,
        description: message,
        audience,
        category,
        imageUrl,
        ctaLabel,
        ctaUrl: link,
        scheduledAt: new Date(scheduledAt).toISOString(),
        expiresAt,
        status: "queued",
        targetUserIds,
        createdBy: actorUserId ? { _type: "reference", _ref: actorUserId } : undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      return NextResponse.json({
        success: true,
        scheduled: true,
        campaignId: campaign._id,
        targetCount: targetUserIds.length,
      });
    }

    const notificationData = {
      category,
      audience,
      expiresAt,
      imageUrl,
      ctaLabel,
      ctaUrl: link,
      route: link || undefined,
      route_path: link || undefined,
    };
    const result = await createAndDispatchNotification({
      eventId,
      type: "system.general",
      actorUserId,
      userIds: targetUserIds,
      title,
      body: message,
      data: notificationData,
      skipActor: false,
    });
    const sent = Number(result.send?.sent || 0);
    const backend =
      sent < targetUserIds.length
        ? await sendBackendBroadcast({
            eventId,
            actorUserId,
            userIds: targetUserIds,
            audience,
            title,
            body: message,
            data: notificationData,
          })
        : undefined;

    return NextResponse.json(
      {
        success: result.ok || Boolean(backend?.ok),
        targetCount: result.targetUserIds.length,
        notificationId: result.notificationId,
        send: result.send,
        backendSend: backend?.result,
        error: result.error,
      },
      { status: result.ok || backend?.ok ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
