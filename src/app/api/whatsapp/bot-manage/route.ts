import { NextRequest, NextResponse } from "next/server";
import { getOpenWaSessionStatus, sendOpenWaText, startOpenWaSession } from "@/lib/openwa-client";

export async function GET(req: NextRequest) {
  try {
    const logType = req.nextUrl.searchParams.get("logType");
    if (logType === "bill-payment" || logType === "tool-rent") {
      return NextResponse.json({ ok: true, logs: [] });
    }

    const status = await getOpenWaSessionStatus();
    if (!status.ok) {
      return NextResponse.json({ ok: false, error: status.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      status: status.status,
      phone: status.phone,
      pushName: status.pushName,
      connected: status.status === "ready",
      authenticated: status.status === "ready",
      hasQr: false,
      queueSize: 0,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Bot proxy failed: ${msg}` }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, phone, message } = body;

    switch (action) {
      case "wake": {
        const result = await startOpenWaSession();
        if (!result.ok) {
          return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
        }
        return NextResponse.json({ ok: true, message: "Session started" });
      }

      case "test-send": {
        if (!phone || !message) {
          return NextResponse.json({ ok: false, error: "phone and message are required for test-send" }, { status: 400 });
        }
        const result = await sendOpenWaText(phone, message);
        return NextResponse.json({ ok: result.ok, messageId: result.messageId, jid: result.jid, error: result.error });
      }

      case "restart-safe": {
        const result = await startOpenWaSession();
        return NextResponse.json({ ok: true, message: "Session restarted" });
      }

      case "force-reset":
        return NextResponse.json({ ok: false, error: "Force reset not supported via API. Use OpenWA dashboard." }, { status: 400 });

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
