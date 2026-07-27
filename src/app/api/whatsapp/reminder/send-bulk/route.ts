import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { emitWaEventServer } from "@/lib/wa-bot-server";

const RATE_LIMIT_MS = 5 * 60 * 1000;
const reminderTimestamps = new Map<string, number>();

function isRateLimited(billId: string, customerId: string) {
  const key = `${billId}:${customerId}`;
  const lastSent = reminderTimestamps.get(key);
  if (!lastSent) return false;
  return Date.now() - lastSent < RATE_LIMIT_MS;
}

function markReminderSent(billId: string, customerId: string) {
  reminderTimestamps.set(`${billId}:${customerId}`, Date.now());
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "admin" && auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only Admin or Super Admin can send manual reminders" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { reminders, reminderType = "manual_bill_reminder" } = body;

    if (!Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json({ success: false, error: "reminders array is required" }, { status: 400 });
    }
    if (reminders.length > 50) {
      return NextResponse.json({ success: false, error: "Maximum 50 reminders per batch" }, { status: 400 });
    }

    const results: Array<{ billId: string; customerId: string; status: string; error?: string }> = [];

    for (const reminder of reminders) {
      const { billId, customerId, paymentStatus, phone, customerName } = reminder;

      if (paymentStatus === "paid") {
        results.push({ billId, customerId, status: "skipped_paid" });
        continue;
      }

      if (billId && isRateLimited(billId, customerId)) {
        results.push({ billId, customerId, status: "rate_limited", error: "Sent recently" });
        continue;
      }

      try {
        if (!phone) {
          results.push({ billId, customerId, status: "failed", error: "No phone number" });
          continue;
        }

        const sendResult = await emitWaEventServer("billing.reminder", {
          customerId, billId, customerName: customerName || "Customer", customerPhone: phone,
          bills: reminder.bills || (billId ? [{ _id: billId, billNumber: reminder.billNumber, totalAmount: reminder.totalAmount, paidAmount: reminder.paidAmount, balanceAmount: reminder.balanceAmount, dueDate: reminder.dueDate }] : []),
          eventId: `${reminderType}.${billId || customerId}`,
        });

        if (sendResult.ok && billId && customerId) markReminderSent(billId, customerId);

        results.push({
          billId,
          customerId,
          status: sendResult.ok ? "sent" : "failed",
          error: sendResult.error,
        });
      } catch (error: any) {
        results.push({ billId, customerId, status: "failed", error: error?.message || "Failed to send" });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const rateLimited = results.filter((r) => r.status === "rate_limited").length;
    const skippedPaid = results.filter((r) => r.status === "skipped_paid").length;

    return NextResponse.json({
      success: true,
      results,
      summary: { total: reminders.length, sent, failed, rateLimited, skippedPaid },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to process bulk reminders" }, { status: 500 });
  }
}
