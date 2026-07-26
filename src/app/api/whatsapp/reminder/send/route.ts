import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { sendWhatsAppNotification } from "@/lib/send-whatsapp-notification";
import { notificationTemplates } from "@/lib/notifications/template-engine";

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
  reminderTimestamps.set(getRateLimitKey(billId, customerId), Date.now());
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
    const { billId, customerId, reminderType = "manual_bill_reminder", forceResend = false } = body;

    if (!billId && !customerId) {
      return NextResponse.json({ success: false, error: "billId or customerId is required" }, { status: 400 });
    }

    if (billId && isRateLimited(billId, customerId || "", forceResend)) {
      return NextResponse.json({ success: false, error: "Reminder was already sent recently. Try again in 5 minutes.", rateLimited: true }, { status: 429 });
    }

    const customerName = String(body.customerName || "Customer");
    const phone = String(body.phone || "").replace(/\D/g, "");

    if (!phone) {
      return NextResponse.json({ success: false, error: "Customer phone number is required" }, { status: 400 });
    }

    const message = notificationTemplates.paymentReminder({
      customer: { name: customerName },
      bills: body.bills || (billId ? [{ _id: billId, billNumber: body.billNumber, totalAmount: body.totalAmount, paidAmount: body.paidAmount, balanceAmount: body.balanceAmount, dueDate: body.dueDate }] : []),
    });

    const result = await sendWhatsAppNotification({
      eventType: reminderType,
      phone,
      message,
      metadata: { entityId: billId || customerId, adminId: auth.userId },
    });

    if (billId && customerId) markReminderSent(billId, customerId);

    return NextResponse.json({
      success: result.ok,
      ...(result.error ? { error: result.error } : {}),
      audit: { adminId: auth.userId, adminName: auth.user?.name, sentAt: new Date().toISOString(), reminderType },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to send reminder" }, { status: 500 });
  }
}
