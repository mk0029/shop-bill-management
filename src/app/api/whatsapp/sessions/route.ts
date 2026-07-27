import { NextResponse } from "next/server";

function getOpenWaBaseUrl(): string {
  return (process.env.OPENWA_URL || "http://localhost:2785").replace(/\/+$/, "");
}

function getOpenWaApiKey(): string {
  return process.env.OPENWA_API_KEY || "";
}

export async function GET() {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions`, {
      headers: { "X-API-Key": getOpenWaApiKey() },
      signal: AbortSignal.timeout(10_000),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.message || `${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sessions: Array.isArray(json) ? json : [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
