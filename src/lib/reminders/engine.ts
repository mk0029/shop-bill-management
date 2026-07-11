import { sanityClient } from "@/lib/sanity";
import { sendWhatsAppNotification } from "@/lib/send-whatsapp-notification";
import { sendAppEmail } from "@/lib/email/server";
import type {
  CustomerReminderConfig,
  GlobalReminderSettings,
  ReminderCandidate,
  ReminderResult,
  ReminderRunReport,
  ReminderChannel,
} from "@/types/reminder";

const DEFAULT_CUSTOMER_CONFIG: CustomerReminderConfig = {
  reminderEnabled: true,
  firstReminderOffsetDays: 6,
  reminderIntervalDays: 7,
  preferredChannels: ["whatsapp"],
  stopAfterPayment: true,
};

const DEFAULT_GLOBAL_SETTINGS: GlobalReminderSettings = {
  autoReminderEnabled: true,
  defaultFirstReminderOffsetDays: 6,
  defaultReminderIntervalDays: 7,
  defaultSendTime: "08:30",
  timezone: "Asia/Kolkata",
  minimumPendingAmount: 0,
  allowManualReminder: true,
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(now: Date): string {
  return ymd(now);
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

async function loadGlobalSettings(): Promise<GlobalReminderSettings> {
  const doc: Record<string, unknown> | null = await sanityClient.fetch(
    `*[_type == "billReminderSettings"][0]`,
  );
  if (!doc) return DEFAULT_GLOBAL_SETTINGS;
  return {
    autoReminderEnabled: doc.autoReminderEnabled !== false,
    defaultFirstReminderOffsetDays: Math.max(
      1,
      Math.trunc(
        Number(doc.billReminderGapDays) || DEFAULT_GLOBAL_SETTINGS.defaultFirstReminderOffsetDays,
      ),
    ),
    defaultReminderIntervalDays: Math.max(
      1,
      Math.trunc(
        Number(doc.overdueReminderRepeatDays) ||
          DEFAULT_GLOBAL_SETTINGS.defaultReminderIntervalDays,
      ),
    ),
    defaultSendTime: String(doc.reminderSendTime || DEFAULT_GLOBAL_SETTINGS.defaultSendTime),
    timezone: String(doc.timezone || DEFAULT_GLOBAL_SETTINGS.timezone),
    minimumPendingAmount: Math.max(
      0,
      Number(doc.minimumPendingAmountForReminder) ||
        DEFAULT_GLOBAL_SETTINGS.minimumPendingAmount,
    ),
    allowManualReminder: doc.allowManualReminder !== false,
  };
}

function getCustomerConfig(customer: Record<string, unknown>): CustomerReminderConfig {
  return {
    reminderEnabled: customer.allowDueReminder !== false,
    firstReminderOffsetDays: Math.max(
      1,
      Math.trunc(
        Number(customer.dueReminderRepeatDays) ||
          DEFAULT_CUSTOMER_CONFIG.firstReminderOffsetDays,
      ),
    ),
    reminderIntervalDays: Math.max(
      1,
      Math.trunc(
        Number(customer.reminderIntervalDays) || DEFAULT_CUSTOMER_CONFIG.reminderIntervalDays,
      ),
    ),
    preferredReminderTime: (customer.preferredReminderTime as string) || undefined,
    preferredChannels: Array.isArray(customer.preferredChannels)
      ? (customer.preferredChannels as ReminderChannel[])
      : DEFAULT_CUSTOMER_CONFIG.preferredChannels,
    maximumReminderCount:
      customer.maximumReminderCount != null
        ? Math.max(1, Math.trunc(Number(customer.maximumReminderCount)))
        : undefined,
    stopAfterPayment: customer.stopAfterPayment !== false,
  };
}

function pendingAmount(bill: Record<string, unknown>): number {
  const balance =
    typeof bill.balanceAmount === "number" ? Number(bill.balanceAmount) : null;
  if (balance !== null) return Math.max(0, balance);
  return Math.max(0, Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0));
}

function isEligibleBill(bill: Record<string, unknown>): boolean {
  const paymentStatus = String(bill.paymentStatus || "").toLowerCase();
  const status = String(bill.status || "").toLowerCase();
  if (["paid", "cancelled", "deleted", "draft", "refunded", "archived"].includes(paymentStatus))
    return false;
  if (["cancelled", "deleted", "draft", "archived"].includes(status)) return false;
  if (!["pending", "partial"].includes(paymentStatus)) return false;
  return pendingAmount(bill) > 0;
}

async function fetchReminderCandidates(): Promise<ReminderCandidate[]> {
  const bills: Record<string, unknown>[] = await sanityClient.fetch(
    `*[_type == "bill"] | order(dueDate desc, createdAt desc) {
      _id,
      billNumber,
      status,
      paymentStatus,
      totalAmount,
      paidAmount,
      balanceAmount,
      dueDate,
      createdAt,
      lastReminderSentAt,
      reminderCount,
      customer->{
        _id,
        customerId,
        name,
        nickname,
        phone,
        email,
        allowDueReminder,
        dueReminderRepeatDays,
        reminderIntervalDays,
        preferredReminderTime,
        preferredChannels,
        maximumReminderCount,
        stopAfterPayment,
        reminderLimit
      }
    }`,
  );

  return (bills || [])
    .filter(isEligibleBill)
    .filter((b: Record<string, unknown>) => (b.customer as Record<string, unknown>)?._id)
    .map((b: Record<string, unknown>) => ({
      customerId: (b.customer as Record<string, unknown>)._id as string,
      billId: b._id as string,
      billNumber: (b.billNumber as string) || "",
      customerName: String(
        (b.customer as Record<string, unknown>).nickname ||
          (b.customer as Record<string, unknown>).name ||
          "Customer",
      ).trim(),
      customerPhone: String((b.customer as Record<string, unknown>).phone || "").trim(),
      customerEmail:
        String((b.customer as Record<string, unknown>).email || "").trim() || undefined,
      totalAmount: Number(b.totalAmount || 0),
      paidAmount: Number(b.paidAmount || 0),
      balanceAmount: pendingAmount(b),
      dueDate: (b.dueDate as string) || (b.createdAt as string) || "",
      billDate: (b.createdAt as string) || "",
      lastReminderSentAt: b.lastReminderSentAt as string | undefined,
      reminderCount: Number(b.reminderCount || 0),
    }));
}

function isReminderDue(
  candidate: ReminderCandidate,
  config: CustomerReminderConfig,
  now: Date,
): { eligible: boolean; reason?: string } {
  const today = todayKey(now);
  const dueDateKey = candidate.dueDate ? ymd(new Date(candidate.dueDate)) : "";

  if (!dueDateKey) return { eligible: false, reason: "no_due_date" };

  const firstEligibleDate = addDays(dueDateKey, config.firstReminderOffsetDays);

  if (today < firstEligibleDate) {
    return { eligible: false, reason: `first_reminder_not_due_until_${firstEligibleDate}` };
  }

  if (!candidate.lastReminderSentAt) {
    return { eligible: true };
  }

  const lastSentKey = ymd(new Date(candidate.lastReminderSentAt));
  const nextEligibleDate = addDays(lastSentKey, config.reminderIntervalDays);

  if (today < nextEligibleDate) {
    return { eligible: false, reason: `next_reminder_not_due_until_${nextEligibleDate}` };
  }

  if (config.maximumReminderCount != null && candidate.reminderCount >= config.maximumReminderCount) {
    return { eligible: false, reason: "max_reminder_count_reached" };
  }

  return { eligible: true };
}

function buildWhatsAppMessage(candidate: ReminderCandidate): string {
  const name = candidate.customerName;
  const formattedDue = candidate.dueDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(candidate.dueDate))
    : "N/A";
  const formattedAmount = `\u20b9${candidate.balanceAmount.toLocaleString("en-IN")}`;

  return [
    "Payment Reminder",
    "",
    `Dear ${name},`,
    "",
    "This is a friendly reminder that you have an outstanding payment.",
    "",
    `Bill: ${candidate.billNumber}`,
    `Due Date: ${formattedDue}`,
    `Outstanding Amount: ${formattedAmount}`,
    "",
    "We kindly request you to complete the payment at your earliest convenience.",
    "",
    "If payment has already been made, please disregard this message.",
    "",
    "Thank you for your continued business.",
    "Regards,",
    "Jambh Electricals",
  ].join("\n");
}

function buildEmailHtml(candidate: ReminderCandidate): string {
  const name = candidate.customerName;
  const formattedDue = candidate.dueDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(candidate.dueDate))
    : "N/A";
  const formattedAmount = `\u20b9${candidate.balanceAmount.toLocaleString("en-IN")}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Payment Reminder</h2>
      <p>Dear ${name},</p>
      <p>This is a friendly reminder that you have an outstanding payment.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Bill</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${candidate.billNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Due Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${formattedDue}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Outstanding Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong style="color: #dc2626;">${formattedAmount}</strong></td></tr>
      </table>
      <p>We kindly request you to complete the payment at your earliest convenience.</p>
      <p style="color: #666; font-size: 13px;">If payment has already been made, please disregard this message.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 13px;">Thank you for your continued business.<br>Jambh Electricals</p>
    </div>
  `;
}

async function sendViaChannel(
  candidate: ReminderCandidate,
  channel: ReminderChannel,
  idempotencyKey: string,
): Promise<{ sent: boolean; error?: string }> {
  if (channel === "whatsapp") {
    if (!candidate.customerPhone) return { sent: false, error: "no_phone" };
    const message = buildWhatsAppMessage(candidate);
    const result = await sendWhatsAppNotification({
      eventType: "billReminder.auto",
      phone: candidate.customerPhone,
      message,
      metadata: { idempotencyKey, billId: candidate.billId, customerId: candidate.customerId },
    });
    return { sent: result.ok, error: result.error || result.reason };
  }

  if (channel === "email") {
    if (!candidate.customerEmail) return { sent: false, error: "no_email" };
    const html = buildEmailHtml(candidate);
    const result = await sendAppEmail({
      to: candidate.customerEmail,
      subject: `Payment Reminder - ${candidate.billNumber}`,
      html,
      text: buildWhatsAppMessage(candidate),
    });
    return { sent: result.sent, error: result.reason };
  }

  return { sent: false, error: `unsupported_channel_${channel}` };
}

async function createReminderLog(params: {
  idempotencyKey: string;
  customerId: string;
  billId: string;
  channel: ReminderChannel;
  status: "sent" | "skipped" | "failed" | "duplicate";
  reason?: string;
  mode: "auto" | "manual";
  reminderNumber: number;
  sentBy?: string;
}): Promise<void> {
  const safeId = params.idempotencyKey.replace(/[^a-zA-Z0-9_.-]/g, "-");
  try {
    await sanityClient.createIfNotExists({
      _id: `billReminderLog.${safeId}`,
      _type: "billReminderLog",
      idempotencyKey: params.idempotencyKey,
      reminderType: "daily_reminder",
      mode: params.mode,
      status: params.status,
      reason: params.reason || "",
      customerId: params.customerId,
      customer: { _type: "reference", _ref: params.customerId },
      billIds: [params.billId],
      dueDate: "",
      cycleDate: todayKey(new Date()),
      totalPendingAmount: 0,
      billCount: 1,
      adminId: params.sentBy || "",
      payload: {
        json: JSON.stringify({
          channel: params.channel,
          reminderNumber: params.reminderNumber,
          sentAt: new Date().toISOString(),
        }),
      },
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ReminderEngine] Failed to create reminder log:", err);
  }
}

async function updateBillReminderTracking(billId: string, now: Date): Promise<void> {
  try {
    const bill: { reminderCount?: number } | null = await sanityClient.fetch(
      `*[_type == "bill" && _id == $billId]{_id, reminderCount}[0]`,
      { billId },
    );
    if (!bill) return;
    await sanityClient
      .patch(billId)
      .set({
        lastReminderSentAt: now.toISOString(),
        reminderCount: (bill.reminderCount || 0) + 1,
      })
      .commit();
  } catch (err) {
    console.error("[ReminderEngine] Failed to update bill tracking:", billId, err);
  }
}

async function tryAcquireLock(lockKey: string): Promise<boolean> {
  try {
    await sanityClient.create({
      _id: `reminderLock.${lockKey}`,
      _type: "billReminderLog",
      idempotencyKey: `lock:${lockKey}`,
      reminderType: "scheduler_lock",
      mode: "auto",
      status: "sent",
      customerId: "",
      billIds: [],
      dueDate: "",
      cycleDate: todayKey(new Date()),
      totalPendingAmount: 0,
      billCount: 0,
      payload: { json: JSON.stringify({ lockedAt: new Date().toISOString() }) },
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(lockKey: string): Promise<void> {
  try {
    await sanityClient.delete(`reminderLock.${lockKey}`);
  } catch {
    /* ignore */
  }
}

export interface RunAutoRemindersInput {
  now?: Date;
  customerId?: string;
}

export async function runAutoReminders(
  input: RunAutoRemindersInput = {},
): Promise<ReminderRunReport> {
  const now = input.now || new Date();
  const dateKey = todayKey(now);
  const lockKey = `dailyReminder:${dateKey}`;

  const globalSettings = await loadGlobalSettings();
  if (!globalSettings.autoReminderEnabled) {
    return {
      date: dateKey,
      customersProcessed: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      errors: 0,
      results: [],
    };
  }

  const acquired = await tryAcquireLock(lockKey);
  if (!acquired) {
    return {
      date: dateKey,
      customersProcessed: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      errors: 0,
      results: [],
    };
  }

  try {
    const allCandidates = await fetchReminderCandidates();
    const candidates = input.customerId
      ? allCandidates.filter((c) => c.customerId === input.customerId)
      : allCandidates;

    const customerMap = new Map<string, ReminderCandidate[]>();
    for (const c of candidates) {
      const list = customerMap.get(c.customerId) || [];
      list.push(c);
      customerMap.set(c.customerId, list);
    }

    const results: ReminderResult[] = [];
    for (const [, customerBills] of customerMap) {
      customerBills.sort((a, b) => {
        const aDue = a.dueDate || a.billDate || "";
        const bDue = b.dueDate || b.billDate || "";
        return bDue.localeCompare(aDue);
      });

      const latest = customerBills[0];
      if (!latest) continue;

      const customerDoc: Record<string, unknown> | null = await sanityClient.fetch(
        `*[_type == "user" && _id == $id][0]`,
        { id: latest.customerId },
      );
      const config = getCustomerConfig(customerDoc || {});

      if (!config.reminderEnabled) {
        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel: "whatsapp",
          sent: false,
          skipped: true,
          reason: "customer_reminders_disabled",
          idempotencyKey: "",
        });
        continue;
      }

      if (latest.balanceAmount < globalSettings.minimumPendingAmount) {
        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel: "whatsapp",
          sent: false,
          skipped: true,
          reason: "below_minimum_amount",
          idempotencyKey: "",
        });
        continue;
      }

      const dueCheck = isReminderDue(latest, config, now);
      if (!dueCheck.eligible) {
        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel: "whatsapp",
          sent: false,
          skipped: true,
          reason: dueCheck.reason || "not_eligible",
          idempotencyKey: "",
        });
        continue;
      }

      const idempotencyKey = `dailyReminder:${latest.customerId}:${latest.billId}:${dateKey}`;

      const existingLog: { _id?: string } | null = await sanityClient.fetch(
        `*[_type == "billReminderLog" && idempotencyKey == $key][0]{_id}`,
        { key: idempotencyKey },
      );
      if (existingLog) {
        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel: "whatsapp",
          sent: false,
          skipped: true,
          reason: "duplicate_today",
          idempotencyKey,
        });
        continue;
      }

      const currentBill: Record<string, unknown> | null = await sanityClient.fetch(
        `*[_type == "bill" && _id == $id]{_id, paymentStatus, totalAmount, paidAmount, balanceAmount}[0]`,
        { id: latest.billId },
      );
      if (!currentBill || !isEligibleBill(currentBill)) {
        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel: "whatsapp",
          sent: false,
          skipped: true,
          reason: "bill_no_longer_eligible",
          idempotencyKey,
        });
        continue;
      }

      const channels =
        config.preferredChannels.length > 0
          ? config.preferredChannels
          : (["whatsapp"] as ReminderChannel[]);

      for (const channel of channels) {
        const channelKey = `${idempotencyKey}:${channel}`;
        const { sent, error } = await sendViaChannel(latest, channel, channelKey);

        await createReminderLog({
          idempotencyKey: channelKey,
          customerId: latest.customerId,
          billId: latest.billId,
          channel,
          status: sent ? "sent" : "failed",
          reason: error,
          mode: "auto",
          reminderNumber: latest.reminderCount + 1,
        });

        results.push({
          customerId: latest.customerId,
          billId: latest.billId,
          channel,
          sent,
          skipped: !sent,
          reason: error,
          idempotencyKey: channelKey,
        });
      }

      if (results.some((r) => r.customerId === latest.customerId && r.sent)) {
        await updateBillReminderTracking(latest.billId, now);
      }
    }

    const remindersSent = results.filter((r) => r.sent).length;
    const remindersSkipped = results.filter((r) => r.skipped).length;
    const errors = results.filter((r) => !r.sent && !r.skipped).length;

    return {
      date: dateKey,
      customersProcessed: customerMap.size,
      remindersSent,
      remindersSkipped,
      errors,
      results,
    };
  } finally {
    await releaseLock(lockKey);
  }
}

export async function sendManualReminder(input: {
  billId?: string;
  customerId?: string;
  channels?: ReminderChannel[];
  sentBy?: string;
}): Promise<ReminderRunReport> {
  const now = new Date();
  const dateKey = todayKey(now);

  const candidates = await fetchReminderCandidates();
  const filtered = candidates.filter((c) => {
    if (input.billId) return c.billId === input.billId;
    if (input.customerId) return c.customerId === input.customerId;
    return false;
  });

  if (filtered.length === 0) {
    return {
      date: dateKey,
      customersProcessed: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      errors: 0,
      results: [],
    };
  }

  const customerMap = new Map<string, ReminderCandidate[]>();
  for (const c of filtered) {
    const list = customerMap.get(c.customerId) || [];
    list.push(c);
    customerMap.set(c.customerId, list);
  }

  const results: ReminderResult[] = [];
  for (const [, customerBills] of customerMap) {
    customerBills.sort((a, b) => {
      const aDue = a.dueDate || a.billDate || "";
      const bDue = b.dueDate || b.billDate || "";
      return bDue.localeCompare(aDue);
    });

    const latest = customerBills[0];
    if (!latest) continue;

    const customerDoc: Record<string, unknown> | null = await sanityClient.fetch(
      `*[_type == "user" && _id == $id][0]`,
      { id: latest.customerId },
    );
    const config = getCustomerConfig(customerDoc || {});

    const channels =
      input.channels && input.channels.length > 0
        ? input.channels
        : config.preferredChannels.length > 0
          ? config.preferredChannels
          : (["whatsapp"] as ReminderChannel[]);

    for (const channel of channels) {
      const idempotencyKey = `manualReminder:${latest.customerId}:${latest.billId}:${channel}:${Date.now()}`;
      const { sent, error } = await sendViaChannel(latest, channel, idempotencyKey);

      await createReminderLog({
        idempotencyKey,
        customerId: latest.customerId,
        billId: latest.billId,
        channel,
        status: sent ? "sent" : "failed",
        reason: error,
        mode: "manual",
        reminderNumber: latest.reminderCount + 1,
        sentBy: input.sentBy,
      });

      results.push({
        customerId: latest.customerId,
        billId: latest.billId,
        channel,
        sent,
        skipped: !sent,
        reason: error,
        idempotencyKey,
      });
    }
  }

  const remindersSent = results.filter((r) => r.sent).length;
  const remindersSkipped = results.filter((r) => r.skipped).length;
  const errors = results.filter((r) => !r.sent && !r.skipped).length;

  return {
    date: dateKey,
    customersProcessed: customerMap.size,
    remindersSent,
    remindersSkipped,
    errors,
    results,
  };
}
