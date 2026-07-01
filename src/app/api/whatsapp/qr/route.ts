import { NextRequest, NextResponse } from "next/server";

const WA_BOT_URL = String(process.env.WA_BOT_URL || "").replace(/\/+$/, "");
const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || "").trim();

export async function GET() {
  if (!WA_BOT_URL || !WA_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp bot config missing (WA_BOT_URL/WA_BOT_TOKEN)" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${WA_BOT_URL}/api/wa/qr`, {
      headers: { "x-api-key": WA_BOT_TOKEN },
      signal: AbortSignal.timeout(10_000),
    });

    const json = await res.json().catch(() => ({}));

    if (json.qrImageDataUrl) {
      return NextResponse.json({
        ok: true,
        status: json.status,
        qr: json.qr,
        qrImageDataUrl: json.qrImageDataUrl,
      });
    }

    return NextResponse.json(json, { status: res.ok ? 200 : res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `QR proxy failed: ${msg}` },
      { status: 502 },
    );
  }
}
