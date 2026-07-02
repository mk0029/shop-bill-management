import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";

const RATE_LIMIT_MS = 5 * 60 * 1000;

const reminderTimestamps = new Map<string, number>();

function isRateLimited(billId: string, customerId: string) {
  const key = `${billId}:${customerId}`;
  const lastSent = reminderTimestamps.get(key);
  if (!lastSent) return false;
  return Date.now() - lastSent < RATE_LIMIT_MS;
}

function markReminderSent(billId: string, customerId: string) {
  const key = `${billId}:${customerId}`;
  reminderTimestamps.set(key, Date.now());
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
    const { reminders, reminderType = "manual_bill_reminder" } = body;

    if (!Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json(
        { success: false, error: "reminders array is required" },
        { status: 400 }
      );
    }

    if (reminders.length > 50) {
      return NextResponse.json(
        { success: false, error: "Maximum 50 reminders per batch" },
        { status: 400 }
      );
    }

    const results: Array<{
      billId: string;
      customerId: string;
      status: "sent" | "failed" | "rate_limited" | "skipped_paid";
      error?: string;
    }> = [];

    for (const reminder of reminders) {
      const { billId, customerId, paymentStatus } = reminder;

      if (paymentStatus === "paid") {
        results.push({
          billId,
          customerId,
          status: "skipped_paid",
        });
        continue;
      }

      if (billId && isRateLimited(billId, customerId)) {
        results.push({
          billId,
          customerId,
          status: "rate_limited",
          error: "Sent recently",
        });
        continue;
      }

      try {
        await postToReminderBackend({
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

        results.push({
          billId,
          customerId,
          status: "sent",
        });
      } catch (error: any) {
        results.push({
          billId,
          customerId,
          status: "failed",
          error: error?.message || "Failed to send",
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const rateLimited = results.filter((r) => r.status === "rate_limited").length;
    const skippedPaid = results.filter((r) => r.status === "skipped_paid").length;

    console.log(
      `[BULK_MANUAL_REMINDER] ${new Date().toISOString()} | Admin: ${auth.user?.name} (${auth.userId}) | Sent: ${sent} | Failed: ${failed} | Rate limited: ${rateLimited} | Skipped paid: ${skippedPaid}`
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: reminders.length,
        sent,
        failed,
        rateLimited,
        skippedPaid,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process bulk reminders",
      },
      { status: 500 }
    );
  }
}
