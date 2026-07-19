import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";

const RATE_LIMIT_MS = 5 * 60 * 1000;

const reminderTimestamps = new Map<string, number>();

function getRateLimitKey(billId: string, customerId: string) {
  return `${billId}:${customerId}`;
}

function isRateLimited(billId: string, customerId: string, forceResend: boolean) {
  if (forceResend) return false;
  const key = getRateLimitKey(billId, customerId);
  const lastSent = reminderTimestamps.get(key);
  if (!lastSent) return false;
  return Date.now() - lastSent < RATE_LIMIT_MS;
}

function markReminderSent(billId: string, customerId: string) {
  const key = getRateLimitKey(billId, customerId);
  reminderTimestamps.set(key, Date.now());
}

function auditLog(entry: {
  adminId: string;
  adminName: string;
  customerId: string;
  billId: string;
  reminderType: string;
  status: "sent" | "failed" | "rate_limited";
  failureReason?: string;
}) {
  const timestamp = new Date().toISOString();
}

async function postToReminderBackend(payload: Record<string, unknown>) {
  const baseUrl = (
    process.env.WA_BACKEND_URL ||
    process.env.WA_BOT_URL ||
    process.env.WHATSAPP_BACKEND_URL ||
    process.env.NOTIFICATION_API_URL ||
    ""
  ).replace(/\/+$/, "");

  const secret =
    process.env.WA_BOT_TOKEN ||
    process.env.API_KEY ||
    process.env.WA_EVENT_SECRET ||
    process.env.NOTIFY_API_SECRET ||
    "";

  if (!baseUrl || !secret) {
    throw new Error(
      "Bill reminder backend config missing (NOTIFICATION_API_URL/NOTIFY_API_SECRET)"
    );
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
  if (!res.ok) {
    throw new Error(
      json?.error || `Bill reminder backend failed (${res.status})`
    );
  }
  return json;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (auth.role !== "admin" && auth.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only Admin or Super Admin can send manual reminders" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      billId,
      customerId,
      reminderType = "manual_bill_reminder",
      forceResend = false,
    } = body;

    if (!billId && !customerId) {
      return NextResponse.json(
        { success: false, error: "billId or customerId is required" },
        { status: 400 }
      );
    }

    if (billId && isRateLimited(billId, customerId || "", forceResend)) {
      auditLog({
        adminId: auth.userId || "",
        adminName: (auth.user?.name as string) || "Unknown",
        customerId: customerId || "",
        billId: billId || "",
        reminderType,
        status: "rate_limited",
        failureReason: "Reminder was already sent recently. Try again in 5 minutes.",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Reminder was already sent recently. Try again in 5 minutes.",
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    const result = await postToReminderBackend({
      customerId: customerId || undefined,
      billId: billId || undefined,
      reminderType,
      adminId: auth.userId || auth.customerId || "frontend-admin",
      adminName: (auth.user?.name as string) || "Admin",
      manualTrigger: true,
    });

    if (billId && customerId) {
      markReminderSent(billId, customerId);
    }

    auditLog({
      adminId: auth.userId || "",
      adminName: (auth.user?.name as string) || "Unknown",
      customerId: customerId || "",
      billId: billId || "",
      reminderType,
      status: "sent",
    });

    return NextResponse.json({
      success: true,
      ...result,
      audit: {
        adminId: auth.userId,
        adminName: auth.user?.name,
        sentAt: new Date().toISOString(),
        reminderType,
      },
    });
  } catch (error: any) {
    const body = await req.json().catch(() => ({}));
    auditLog({
      adminId: "",
      adminName: "",
      customerId: body?.customerId || "",
      billId: body?.billId || "",
      reminderType: body?.reminderType || "manual_bill_reminder",
      status: "failed",
      failureReason: error?.message || "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to send reminder",
      },
      { status: 500 }
    );
  }
}
