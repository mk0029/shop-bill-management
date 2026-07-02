import { NextRequest, NextResponse } from "next/server";

async function postBackendReminder(payload: Record<string, unknown>) {
  const baseUrl = (process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || process.env.NOTIFICATION_API_URL || "").replace(/\/+$/, "");
  const secret = process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || process.env.NOTIFY_API_SECRET || "";
  if (!baseUrl || !secret) {
    throw new Error("Bill reminder backend config missing (NOTIFICATION_API_URL/NOTIFY_API_SECRET)");
  }
  const res = await fetch(`${baseUrl}/bill-reminder/send-reminder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": secret,
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Bill reminder backend failed (${res.status})`);
  return json;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const billId = String(body?.billId || "").trim();
    const previewOnly = Boolean(body?.previewOnly);

    if (!customerId && !billId) {
      return NextResponse.json({ success: false, error: "customerId or billId is required" }, { status: 400 });
    }

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        message: "Preview is handled by the backend reminder engine. Send without previewOnly to dispatch a manual reminder.",
      });
    }

    const result = await postBackendReminder({
      customerId: customerId || undefined,
      billId: billId || undefined,
      customMessage: body?.customMessage,
      adminId: body?.adminId || body?.actorUserId || "frontend-admin",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process due reminder" },
      { status: 500 },
    );
  }
}

