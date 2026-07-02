import { NextRequest, NextResponse } from "next/server";

const WA_BOT_URL = String(process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || "").replace(/\/+$/, "");
const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || "").trim();

async function proxyToBot(
  path: string,
  options?: { method?: string; body?: string; timeoutMs?: number },
) {
  if (!WA_BOT_URL || !WA_BOT_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: "WhatsApp bot config missing (WA_BOT_URL/WA_BOT_TOKEN)",
      },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${WA_BOT_URL}${path}`, {
      method: options?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WA_BOT_TOKEN,
      },
      body: options?.body,
      signal: AbortSignal.timeout(options?.timeoutMs || 15_000),
    });

    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Bot proxy failed: ${msg}` },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest) {
  const logType = req.nextUrl.searchParams.get("logType");
  const limit = req.nextUrl.searchParams.get("limit") || "200";
  if (logType === "bill-payment") return proxyToBot(`/api/wa/bill-payment/logs?limit=${encodeURIComponent(limit)}`);
  if (logType === "tool-rent") return proxyToBot(`/api/wa/tool-rent/logs?limit=${encodeURIComponent(limit)}`);
  return proxyToBot("/api/wa/status");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, phone, message } = body;

    switch (action) {
      case "wake":
        return proxyToBot("/api/wa/wake", { method: "POST" });

      case "test-send": {
        if (!phone || !message) {
          return NextResponse.json(
            { ok: false, error: "phone and message are required for test-send" },
            { status: 400 },
          );
        }
        return proxyToBot("/api/wa/send-test", {
          method: "POST",
          body: JSON.stringify({ phone, message }),
          timeoutMs: 120_000,
        });
      }

      case "restart-safe":
        return proxyToBot("/api/wa/safe-restart", { method: "POST", timeoutMs: 60_000 });

      case "force-reset":
        return proxyToBot("/api/wa/force-reset", { method: "POST", timeoutMs: 60_000 });

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
