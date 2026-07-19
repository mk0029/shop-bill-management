/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { emitWaEventServer } from "@/lib/wa-bot-server";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventName, payload } = body || {};
    if (!eventName || typeof eventName !== "string") {
      return NextResponse.json({ ok: false, error: "eventName is required" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ ok: false, error: "payload is required" }, { status: 400 });
    }
    const result = await emitWaEventServer(eventName, payload);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "WA emit failed" }, { status: 500 });
  }
}
