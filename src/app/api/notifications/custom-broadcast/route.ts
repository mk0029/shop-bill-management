import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { createDocument, updateDocument } from "@/lib/sanity/write-router";
import { getServerAuth } from "@/lib/server-auth";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import { sendFcmToTokens } from "@/services/notifications/fcm-sender.server";

type NotificationCampaignDoc = {
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
};

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

async function sendDirectBroadcast(input: {
  userIds: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
}): Promise<{ ok: boolean; sent: number; failed: number; errorMessage?: string }> {
  try {
    const tokens = await getActiveTokenStringsForUsers(input.userIds);
    if (!tokens.length) {
      return { ok: false, sent: 0, failed: 0, errorMessage: "No FCM tokens found" };
    }
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.data)) {
      stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    const result = await sendFcmToTokens({ tokens, title: input.title, body: input.body, data: stringData });
    return { ok: result.success, sent: result.sent, failed: result.failed, errorMessage: result.errors?.[0] };
  } catch (error) {
    return { ok: false, sent: 0, failed: 0, errorMessage: error instanceof Error ? error.message : "FCM send failed" };
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
    const campaignQuery = `*[_type=="notificationCampaign" && status=="queued" && scheduledAt <= $now][0...20]{
        _id,title,description,audience,category,imageUrl,ctaLabel,ctaUrl,expiresAt,targetUserIds,createdBy
      }`;
    const commsCampaigns = (await getSanityClient("comms")
      .fetch<NotificationCampaignDoc[]>(campaignQuery, { now })
      .catch(() => [])) || [];
    const campaigns = commsCampaigns.length
      ? commsCampaigns
      : ((await sanityClient
          .fetch<NotificationCampaignDoc[]>(campaignQuery, { now })
          .catch(() => [])) || []);

    const results: Array<{
      campaignId: string;
      success: boolean;
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
      const result = await sendDirectBroadcast({
        userIds: targetUserIds,
        title: String(campaign.title || "Offer"),
        body: String(campaign.description || ""),
        data: notificationData,
      });
      await updateDocument(
        campaign._id,
        {
          status: result.ok ? "sent" : "failed",
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(!result.ok ? { error: result.errorMessage || "FCM send failed" } : {}),
        },
        "notifications",
      ).catch(() => {});
      results.push({ campaignId: campaign._id, success: result.ok });
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

    if (isFutureDate(scheduledAt)) {
      const campaign = await createDocument({
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
      } as unknown as Record<string, unknown>, "notifications");
      if (!campaign.success) {
        throw new Error(campaign.error || "Failed to create campaign");
      }
      return NextResponse.json({
        success: true,
        scheduled: true,
        campaignId: campaign.documentId,
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
    const backend = await sendDirectBroadcast({
      userIds: targetUserIds,
      title,
      body: message,
      data: notificationData,
    });

    return NextResponse.json(
      {
        success: Boolean(backend.ok),
        targetCount: targetUserIds.length,
        sent: backend.sent,
        failed: backend.failed,
        error: backend.ok ? undefined : backend.errorMessage || "FCM send failed",
      },
      { status: backend.ok ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
