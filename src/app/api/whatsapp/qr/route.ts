import { NextResponse } from "next/server";
import { getOpenWaQrCode, getOpenWaSessionStatus, startOpenWaSession } from "@/lib/openwa-client";

const BASE_URL = (process.env.OPENWA_URL || "http://localhost:2785").replace(/\/+$/, "");
const API_KEY = process.env.OPENWA_API_KEY || "";

async function startSessionAndAwaitQr(sessionId: string, retries = 15): Promise<{ ok: boolean; qrCode?: string; status?: string; error?: string }> {
  // Start the session engine
  const startRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/start`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
  });
  if (!startRes.ok) {
    const json = await startRes.json().catch(() => ({}));
    return { ok: false, error: json?.message || `start failed: ${startRes.status}` };
  }

  // Poll for QR code
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const qrRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/qr`, {
      headers: { "X-API-Key": API_KEY },
    });
    if (!qrRes.ok) {
      const json = await qrRes.json().catch(() => ({}));
      if (qrRes.status === 400 && json?.message?.includes("not ready")) continue;
      if (qrRes.status === 400 && json?.message?.includes("already authenticated")) {
        const statusJson = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
          headers: { "X-API-Key": API_KEY },
        }).then((r) => r.json()).catch(() => ({}));
        return { ok: true, qrCode: undefined, status: "ready", ...statusJson };
      }
      return { ok: false, error: json?.message || `qr failed: ${qrRes.status}` };
    }
    const json = await qrRes.json();
    if (json.qrCode || json.status === "qr_ready") {
      return { ok: true, qrCode: json.qrCode, status: json.status || "qr_ready" };
    }
  }
  return { ok: false, error: "QR code not generated after multiple retries" };
}

export async function GET() {
  try {
    const sessionId = process.env.OPENWA_SESSION_ID || "";
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "OPENWA_SESSION_ID not configured" }, { status: 500 });
    }

    // Check current status
    const status = await getOpenWaSessionStatus();
    if (status.ok && status.status === "ready") {
      return NextResponse.json({
        ok: true,
        status: "ready",
        qr: null,
        qrImageDataUrl: null,
        phone: status.phone,
      });
    }

    // Not ready — start session and get QR
    const result = await startSessionAndAwaitQr(sessionId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: result.status || "unknown", error: result.error }, { status: 502 });
    }

    if (result.status === "ready") {
      return NextResponse.json({
        ok: true,
        status: "ready",
        qr: null,
        qrImageDataUrl: null,
        phone: result.phone,
      });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      qr: result.qrCode ? "data:image/png;base64,..." : null,
      qrImageDataUrl: result.qrCode,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `QR proxy failed: ${msg}` }, { status: 502 });
  }
}
