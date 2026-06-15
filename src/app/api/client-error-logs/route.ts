import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export const dynamic = "force-dynamic";

function text(value: unknown, max = 4000) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, max);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();

    const doc = {
      _type: "clientErrorLog",
      source: text(body.source, 160) || "client",
      message: text(body.message, 2000) || "Unknown client error",
      stack: text(body.stack, 8000),
      userId: text(body.userId, 160),
      route: text(body.route, 500),
      userAgent: text(body.userAgent, 1200),
      browser: text(body.browser, 1200),
      platform: text(body.platform, 200),
      isOppo: Boolean(body.isOppo),
      isMobile: Boolean(body.isMobile),
      viewport: objectValue(body.viewport),
      capabilities: objectValue(body.capabilities),
      connection: objectValue(body.connection),
      extra: objectValue(body.extra),
      occurredAt: text(body.time, 80) || now,
      receivedAt: now,
    };

    await sanityClient.create(doc);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[client-error-logs] Failed to persist client error", error);
    return NextResponse.json({ success: false }, { status: 202 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const oppoOnly = searchParams.get("oppo") === "1";
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const filter = oppoOnly ? "&& isOppo == true" : "";

  try {
    const logs = await sanityClient.fetch(
      `*[_type == "clientErrorLog" ${filter}] | order(receivedAt desc)[0...$limit] {
        _id,
        source,
        message,
        stack,
        userId,
        route,
        userAgent,
        browser,
        platform,
        isOppo,
        isMobile,
        viewport,
        capabilities,
        connection,
        extra,
        occurredAt,
        receivedAt
      }`,
      { limit },
    );
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("[client-error-logs] Failed to read client errors", error);
    return NextResponse.json({ success: false, logs: [] }, { status: 500 });
  }
}
