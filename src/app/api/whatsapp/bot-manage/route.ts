import { NextRequest, NextResponse } from "next/server";

const WA_BOT_URL = String(process.env.WA_BOT_URL || "").replace(/\/+$/, "");
const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || "").trim();

async function proxyToBot(
  path: string,
  options?: { method?: string; body?: string },
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
      signal: AbortSignal.timeout(15_000),
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

export async function GET() {
  return proxyToBot("/wa-bot/status");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, phone, message } = body;

    switch (action) {
      case "wake":
        return proxyToBot("/wa-bot/wake", { method: "POST" });

      case "test-send": {
        if (!phone || !message) {
          return NextResponse.json(
            { ok: false, error: "phone and message are required for test-send" },
            { status: 400 },
          );
        }
        return proxyToBot("/wa-bot/test-send", {
          method: "POST",
          body: JSON.stringify({ phone, message }),
        });
      }

      case "restart-safe":
        return proxyToBot("/wa-bot/restart-safe", { method: "POST" });

      case "force-reset":
        return proxyToBot("/wa-bot/force-reset", { method: "POST" });

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
