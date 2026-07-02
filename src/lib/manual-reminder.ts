export interface SendReminderPayload {
  billId?: string;
  customerId?: string;
  reminderType?: string;
  forceResend?: boolean;
}

export interface SendReminderResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  audit?: {
    adminId: string;
    adminName: string;
    sentAt: string;
    reminderType: string;
  };
}

export interface BulkReminderItem {
  billId: string;
  customerId: string;
  paymentStatus?: string;
}

export interface BulkReminderResult {
  success: boolean;
  error?: string;
  results?: Array<{
    billId: string;
    customerId: string;
    status: "sent" | "failed" | "rate_limited" | "skipped_paid";
    error?: string;
  }>;
  summary?: {
    total: number;
    sent: number;
    failed: number;
    rateLimited: number;
    skippedPaid: number;
  };
}

export async function sendManualReminder(
  payload: SendReminderPayload
): Promise<SendReminderResult> {
  const res = await fetch("/api/whatsapp/reminder/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      reminderType: payload.reminderType || "manual_bill_reminder",
    }),
  });

  const json = await res.json().catch(() => ({}));
  return {
    success: Boolean(json?.success),
    error: json?.error,
    rateLimited: Boolean(json?.rateLimited),
    audit: json?.audit,
  };
}

export async function sendBulkReminders(
  reminders: BulkReminderItem[],
  reminderType = "manual_bill_reminder"
): Promise<BulkReminderResult> {
  const res = await fetch("/api/whatsapp/reminder/send-bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reminders, reminderType }),
  });

  const json = await res.json().catch(() => ({}));
  return {
    success: Boolean(json?.success),
    error: json?.error,
    results: json?.results,
    summary: json?.summary,
  };
}
