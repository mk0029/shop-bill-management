/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULT_REMINDER_LIMIT = 100;
export const DUE_REMINDER_COOLDOWN_HOURS = 6;

export type PendingBillItem = {
  billId: string;
  billNumber?: string;
  paymentStatus?: string;
  status?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueDate?: string;
};

export type PendingSummary = {
  pendingBills: Array<{
    billId: string;
    billNumber: string;
    pendingAmount: number;
    dueDate?: string;
    paymentStatus: string;
  }>;
  pendingBillsCount: number;
  totalPendingAmount: number;
};

export type ReminderEligibilityInput = {
  allowDueReminder?: boolean;
  reminderLimit?: number | null;
  totalPendingAmount: number;
  pendingBillsCount: number;
  phone?: string;
  lastDueReminderSentAt?: string | null;
  lastDueReminderAmount?: number | null;
};

export type ReminderEligibilityResult = {
  ok: boolean;
  reason:
    | "ok"
    | "no_pending_bills"
    | "below_limit"
    | "toggle_off"
    | "phone_missing"
    | "duplicate_recent";
  effectiveReminderLimit: number;
  cooldownRemainingMinutes?: number;
};

export function getEffectiveReminderLimit(reminderLimit?: number | null) {
  const n = Number(reminderLimit);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_REMINDER_LIMIT;
  return n;
}

export function calculateCustomerPendingSummary(bills: PendingBillItem[]): PendingSummary {
  const pendingBills = (bills || [])
    .filter((bill) => {
      const paymentStatus = String(bill?.paymentStatus || "").toLowerCase();
      const status = String(bill?.status || "").toLowerCase();
      if (status === "cancelled" || status === "deleted") return false;
      return paymentStatus === "pending" || paymentStatus === "partial";
    })
    .map((bill) => {
      const total = Number(bill?.totalAmount || 0);
      const paid = Number(bill?.paidAmount || 0);
      const explicitBalance = bill?.balanceAmount;
      const pendingAmount =
        typeof explicitBalance === "number"
          ? Math.max(0, Number(explicitBalance))
          : Math.max(0, total - paid);
      return {
        billId: String(bill?.billId || ""),
        billNumber: String(bill?.billNumber || bill?.billId || "-"),
        pendingAmount,
        dueDate: bill?.dueDate,
        paymentStatus: String(bill?.paymentStatus || "pending"),
      };
    })
    .filter((bill) => bill.pendingAmount > 0);

  const totalPendingAmount = pendingBills.reduce((sum, bill) => sum + bill.pendingAmount, 0);
  return {
    pendingBills,
    pendingBillsCount: pendingBills.length,
    totalPendingAmount,
  };
}

export function buildDueReminderMessage(input: {
  customerName?: string;
  summary: PendingSummary;
  shopName?: string;
  helpNote?: string;
}) {
  const customerName = String(input.customerName || "Customer").trim();
  const shopName = String(input.shopName || "Jambh Electrical Services").trim();
  const helpNote =
    String(input.helpNote || "Agar payment already ho chuki hai, to hume reply karke update kar dein.").trim();

  const lines: string[] = [];
  lines.push(`Namaste ${customerName} ji,`);
  lines.push("");
  lines.push(
    `Aapke ${input.summary.pendingBillsCount} bill(s) ka total pending amount Rs ${input.summary.totalPendingAmount.toFixed(2)} hai.`,
  );
  lines.push("");
  lines.push("Pending bills summary:");
  input.summary.pendingBills.slice(0, 5).forEach((bill, idx) => {
    lines.push(`${idx + 1}. ${bill.billNumber}: Rs ${bill.pendingAmount.toFixed(2)}`);
  });
  if (input.summary.pendingBills.length > 5) {
    lines.push(`... aur ${input.summary.pendingBills.length - 5} bill(s)`);
  }
  lines.push("");
  lines.push("Kripya payment complete kar dein.");
  lines.push(helpNote);
  lines.push("");
  lines.push(`- ${shopName}`);

  return lines.join("\n");
}

export function canSendDueReminder(input: ReminderEligibilityInput): ReminderEligibilityResult {
  const effectiveReminderLimit = getEffectiveReminderLimit(input.reminderLimit);
  if (!input.allowDueReminder) {
    return { ok: false, reason: "toggle_off", effectiveReminderLimit };
  }
  if (!String(input.phone || "").trim()) {
    return { ok: false, reason: "phone_missing", effectiveReminderLimit };
  }
  if (!(input.pendingBillsCount > 0) || !(input.totalPendingAmount > 0)) {
    return { ok: false, reason: "no_pending_bills", effectiveReminderLimit };
  }
  if (Number(input.totalPendingAmount || 0) < effectiveReminderLimit) {
    return { ok: false, reason: "below_limit", effectiveReminderLimit };
  }

  const lastAt = input.lastDueReminderSentAt ? new Date(input.lastDueReminderSentAt).getTime() : NaN;
  const now = Date.now();
  if (Number.isFinite(lastAt)) {
    const minutesSince = (now - lastAt) / (1000 * 60);
    const cooldownMinutes = DUE_REMINDER_COOLDOWN_HOURS * 60;
    const sameAmount = Math.abs(Number(input.lastDueReminderAmount || 0) - Number(input.totalPendingAmount || 0)) < 0.01;
    if (minutesSince >= 0 && minutesSince < cooldownMinutes && sameAmount) {
      return {
        ok: false,
        reason: "duplicate_recent",
        effectiveReminderLimit,
        cooldownRemainingMinutes: Math.ceil(cooldownMinutes - minutesSince),
      };
    }
  }

  return { ok: true, reason: "ok", effectiveReminderLimit };
}
