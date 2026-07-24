export type TransactionType = "credit" | "debit";
export type RecordStatus = "completed" | "partial";

export interface ManualCashbookName {
  _id: string;
  name: string;
  normalizedName: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
}

export function normalizeManualName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveEntryDisplayName(
  entry: { user?: { _id?: string; name?: string }; customerName?: string; isCustomName?: boolean },
  customerMap?: Map<string, { name: string; nickname?: string }>
): string {
  if (entry.user?._id && customerMap) {
    const c = customerMap.get(entry.user._id);
    if (c) {
      return c.nickname ? `${c.name} (${c.nickname})` : c.name;
    }
  }
  if (entry.user?.name) return entry.user.name;
  if (entry.customerName) return entry.customerName;
  return "Unnamed Record";
}

export interface PendingTotals {
  byUser: Map<string, number>;
  byCustomerName: Map<string, number>;
}

export function computePendingTotals(
  entries: Array<{
    pendingAmount?: number;
    user?: { _id?: string };
    customerId?: string | null;
    customerName?: string;
  }>
): PendingTotals {
  const byUser = new Map<string, number>();
  const byCustomerName = new Map<string, number>();

  for (const entry of entries) {
    const pending = Number(entry.pendingAmount) || 0;
    if (pending <= 0) continue;

    const cid = entry.customerId || entry.user?._id;
    if (cid) {
      byUser.set(cid, (byUser.get(cid) || 0) + pending);
    }
    if (entry.customerName) {
      byCustomerName.set(
        entry.customerName,
        (byCustomerName.get(entry.customerName) || 0) + pending
      );
    }
  }

  return { byUser, byCustomerName };
}

export interface CustomerSelection {
  customerId: string | null;
  customerName: string;
  isCustomName: boolean;
}

export interface ManualRecordInput {
  customer: CustomerSelection;
  totalAmount: number;
  pendingAmount: number;
  purpose: string;
  type: TransactionType;
}

export interface ManualRecordPayload {
  totalAmount: number;
  pendingAmount: number;
  receivedAmount: number;
  amount: number;
  type: TransactionType;
  purpose: string;
  source: string;
  status: RecordStatus;
  customerName: string;
  customerId: string | null;
  isCustomName: boolean;
  needsManualNameUpsert: boolean;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function calculateReceivedAmount(
  totalAmount: number,
  pendingAmount: number,
  type: TransactionType
): number {
  if (type === "debit") return totalAmount;
  return roundCurrency(totalAmount - pendingAmount);
}

export function calculateStatus(
  pendingAmount: number
): RecordStatus {
  return pendingAmount > 0 ? "partial" : "completed";
}

export function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateManualRecord(
  input: ManualRecordInput
): ValidationResult {
  const { customer, totalAmount, pendingAmount, purpose, type } = input;

  if (!customer.customerName.trim()) {
    return { valid: false, error: "Customer name is required" };
  }

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return { valid: false, error: "Total amount must be a non-negative number" };
  }

  if (totalAmount === 0) {
    return { valid: false, error: "Total amount cannot be zero" };
  }

  if (type === "credit") {
    if (!Number.isFinite(pendingAmount) || pendingAmount < 0) {
      return { valid: false, error: "Pending amount must be a non-negative number" };
    }
    if (pendingAmount > totalAmount) {
      return { valid: false, error: "Pending amount cannot be greater than total amount" };
    }
  }

  if (!purpose.trim()) {
    return { valid: false, error: "Purpose is required" };
  }

  if (type !== "credit" && type !== "debit") {
    return { valid: false, error: "Transaction type must be credit or debit" };
  }

  return { valid: true };
}

export function buildRecordPayload(
  input: ManualRecordInput,
  createdBy: string
): ManualRecordPayload {
  const safeTotal = roundCurrency(input.totalAmount);
  const safePending =
    input.type === "credit" ? roundCurrency(input.pendingAmount) : 0;

  const receivedAmount =
    input.type === "credit"
      ? roundCurrency(safeTotal - safePending)
      : safeTotal;

  return {
    totalAmount: safeTotal,
    pendingAmount: safePending,
    receivedAmount,
    amount: receivedAmount,
    type: input.type,
    purpose: input.purpose.trim(),
    source: "manual",
    status: calculateStatus(safePending),
    customerName: input.customer.customerName.trim(),
    customerId: input.customer.customerId,
    isCustomName: input.customer.isCustomName,
    needsManualNameUpsert: input.customer.isCustomName,
  };
}
