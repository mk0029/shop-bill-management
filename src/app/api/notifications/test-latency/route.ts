import { NextRequest, NextResponse } from "next/server";
import { createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import type { NotificationLatencyMark } from "@/types/notifications";

export const dynamic = "force-dynamic";

function pct(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.round((q / 100) * (sorted.length - 1)));
  return sorted[idx];
}

function summarize(values: number[]) {
  if (!values.length) return { count: 0, min: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    avg: Math.round(sum / sorted.length),
    p50: pct(sorted, 50),
    p95: pct(sorted, 95),
    p99: pct(sorted, 99),
    max: sorted[sorted.length - 1],
  };
}

/**
 * Dedicated FCM latency probe: fires `count` (1-50) real notifications to the
 * target user and reports per-message timings plus summary percentiles.
 *
 * T0 -> dispatch started
 * T1 -> FCM registration tokens resolved
 * T2 -> FCM HTTP v1 accepted the message
 * (T3, device display, is client-side and out of server scope.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const headerUserId = String(req.headers.get("x-user-id") || "").trim();
    const userId = String(body.userId || headerUserId || "").trim();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required (body or x-user-id header)" },
        { status: 400 },
      );
    }

    const count = Math.min(50, Math.max(1, Number(body.count) || 1));
    const actorUserId = String(body.actorUserId || headerUserId || "system").trim();
    const marks: NotificationLatencyMark[] = [];
    const dispatchResults: Array<{ index: number; success: boolean; sent: number; failed: number }> = [];

    for (let i = 0; i < count; i += 1) {
      const eventId = `test.latency.${userId}.${i}.${Date.now()}`;
      const result = await createAndDispatchNotification({
        eventId,
        type: "system.general",
        actorUserId,
        userIds: [userId],
        title: "Latency test",
        body: `Latency test ${i + 1}/${count} · ${new Date().toISOString()}`,
        data: { route: "/admin", testLatency: String(i), dedupeKey: eventId },
        latencyTrace: (mark) => {
          marks.push({ ...mark });
        },
      });
      dispatchResults.push({ index: i, success: result.ok, sent: result.send.sent, failed: result.send.failed });
    }

    const sent = dispatchResults.filter((r) => r.sent > 0).length;
    const noTokens = marks.filter((m) => m.noTokens).length;
    const skipped = marks.filter((m) => m.skipped).length;

    return NextResponse.json({
      success: true,
      userId,
      count,
      sent,
      noTokens,
      skipped,
      summary: {
        totalMs: summarize(marks.filter((m) => !m.skipped).map((m) => m.totalMs)),
        tokenResolveMs: summarize(marks.filter((m) => !m.skipped).map((m) => m.tokenResolveMs)),
        fcmMs: summarize(marks.filter((m) => !m.skipped && !m.noTokens).map((m) => m.fcmMs)),
      },
      perMessage: marks,
      dispatchResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}