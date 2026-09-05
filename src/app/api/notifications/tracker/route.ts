import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { createDocument, deleteDocument } from "@/lib/sanity/write-router";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.NOTIFICATION_TRACKER_SECRET || "";
  if (!secret && process.env.NODE_ENV !== "production") return true;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = req.headers.get("x-cron-secret")?.trim();
  const query = req.nextUrl.searchParams.get("secret")?.trim();
  return Boolean(secret && (bearer === secret || header === secret || query === secret));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Math.max(1, Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 100)));
    const channel = req.nextUrl.searchParams.get("channel") || "";
    const since = req.nextUrl.searchParams.get("since") || "";

    let filter = '_type == "notificationTrackerLog"';
    if (channel) filter += ` && channel == "${channel}"`;
    if (since) filter += ` && trackedAtMs >= ${Number(since)}`;

    const query = `*[${filter}] | order(trackedAtMs desc) [0...${limit}] {
        _id,
        channel,
        eventType,
        status,
        target,
        durationMs,
        error,
        meta,
        trackedAtMs,
        createdAt
      }`;
    const [primaryLogs, commsLogs] = await Promise.all([
      sanityClient.fetch(query).catch(() => []),
      getSanityClient("comms").fetch(query).catch(() => []),
    ]);
    const byId = new Map<string, unknown>();
    for (const log of [...(commsLogs || []), ...(primaryLogs || [])]) {
      const entry = log as { _id?: string };
      if (entry?._id && !byId.has(entry._id)) byId.set(entry._id, log);
    }
    const logs = Array.from(byId.values())
      .sort((a, b) => ((b as { trackedAtMs?: number })?.trackedAtMs || 0) - ((a as { trackedAtMs?: number })?.trackedAtMs || 0))
      .slice(0, limit);

    return NextResponse.json({ success: true, logs, count: logs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.channel || !body?.eventType || !body?.status) {
      return NextResponse.json({ success: false, error: "Missing channel/eventType/status" }, { status: 400 });
    }

    const doc = {
      _type: "notificationTrackerLog",
      channel: body.channel,
      eventType: body.eventType,
      status: body.status,
      target: body.target || "",
      durationMs: body.durationMs || 0,
      error: body.error || "",
      meta: body.meta || {},
      trackedAtMs: body.trackedAtMs || Date.now(),
      createdAt: new Date().toISOString(),
    };

    const result = await createDocument(doc, "notifications");
    if (!result.success) {
      throw new Error(result.error || "Failed to create tracker log");
    }
    return NextResponse.json({ success: true, id: result.documentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ids = await req.json().catch(() => []);
    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ success: false, error: "Provide array of _id values" }, { status: 400 });
    }
    let deleted = 0;
    for (const id of ids.slice(0, 100)) {
      const result = await deleteDocument(String(id), "notifications").catch(() => null);
      if (result && result.success) {
        deleted++;
      } else {
        await getSanityClient("comms").delete(String(id)).catch(() => {});
      }
    }
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
