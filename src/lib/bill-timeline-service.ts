/* eslint-disable @typescript-eslint/no-explicit-any */
import { sanityClient } from "./sanity";

export type TimelineEventType =
  | "bill_created"
  | "bill_edited"
  | "payment_received"
  | "payment_updated"
  | "payment_removed"
  | "advance_adjusted"
  | "payment_method_changed"
  | "status_changed"
  | "due_date_changed"
  | "notes_added"
  | "admin_notes_added"
  | "bill_cancelled"
  | "bill_restored"
  | "refund_issued"
  | "cashbook_synced"
  | "payment_deleted";

export interface TimelineChange {
  field: string;
  label: string;
  oldValue?: string;
  newValue?: string;
}

export interface TimelineEventInput {
  billId: string;
  eventType: TimelineEventType;
  timestamp?: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  description?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: TimelineChange[];
  notes?: string;
  isPublic?: boolean;
  paymentId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  cashBookEntryId?: string;
}

export interface TimelineEvent extends TimelineEventInput {
  _id: string;
  eventId: string;
  createdAt: string;
}

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  bill_created: "Bill Created",
  bill_edited: "Bill Edited",
  payment_received: "Payment Received",
  payment_updated: "Payment Updated",
  payment_removed: "Payment Removed",
  advance_adjusted: "Advance Adjusted",
  payment_method_changed: "Payment Method Changed",
  status_changed: "Status Changed",
  due_date_changed: "Due Date Changed",
  notes_added: "Notes Added",
  admin_notes_added: "Admin Notes Added",
  bill_cancelled: "Bill Cancelled",
  bill_restored: "Bill Restored",
  refund_issued: "Refund Issued",
  cashbook_synced: "Cash Book Synced",
  payment_deleted: "Payment Deleted",
};

export function getEventTypeLabel(type: TimelineEventType): string {
  return EVENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}

function generateEventId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `evt_${ts}_${rand}`;
}

/**
 * Log a bill timeline event to Sanity.
 * Works both server-side and client-side.
 */
export async function logBillEvent(
  input: TimelineEventInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const eventId = generateEventId();
    const now = new Date().toISOString();

    const doc = {
      _type: "billTimelineEvent",
      eventId,
      bill: { _type: "reference", _ref: input.billId },
      eventType: input.eventType,
      timestamp: input.timestamp || now,
      actorUserId: input.actorUserId || "",
      actorName: input.actorName || "System",
      actorRole: input.actorRole || "system",
      description: input.description || "",
      previousValues: input.previousValues
        ? JSON.stringify(input.previousValues)
        : "",
      newValues: input.newValues ? JSON.stringify(input.newValues) : "",
      changes: input.changes || [],
      notes: input.notes || "",
      isPublic: input.isPublic !== false,
      paymentId: input.paymentId || "",
      paymentAmount: input.paymentAmount || 0,
      paymentMethod: input.paymentMethod || "",
      cashBookEntryId: input.cashBookEntryId || "",
      createdAt: now,
    };

    const result = await sanityClient.create(doc);
    return { success: true, eventId: result._id };
  } catch (error: any) {
    console.error("[BillTimeline] Failed to log event:", error);
    return { success: false, error: error?.message || "Failed to log event" };
  }
}

/**
 * Log a timeline event via the API route (browser-side only).
 */
export async function logBillEventFromBrowser(
  input: TimelineEventInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  if (typeof window === "undefined") {
    return logBillEvent(input);
  }
  try {
    const res = await fetch("/api/mutations/bills/log-timeline-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success) {
      return { success: true, eventId: json.eventId };
    }
    return { success: false, error: json?.error || "API error" };
  } catch (error: any) {
    console.error("[BillTimeline] Browser API call failed:", error);
    return { success: false, error: error?.message || "Network error" };
  }
}

/**
 * Fetch timeline events for a bill.
 */
export async function getBillTimeline(
  billId: string,
  options?: { includeNonPublic?: boolean }
): Promise<TimelineEvent[]> {
  try {
    const filter = options?.includeNonPublic
      ? `*[_type == "billTimelineEvent" && bill._ref == $billId]`
      : `*[_type == "billTimelineEvent" && bill._ref == $billId && isPublic == true]`;

    const query = `${filter} | order(timestamp asc) {
      _id,
      eventId,
      eventType,
      timestamp,
      actorUserId,
      actorName,
      actorRole,
      description,
      previousValues,
      newValues,
      changes,
      notes,
      isPublic,
      paymentId,
      paymentAmount,
      paymentMethod,
      cashBookEntryId,
      createdAt
    }`;

    const events = await sanityClient.fetch(query, { billId });
    return events.map((e: any) => ({
      ...e,
      previousValues: e.previousValues ? tryParseJson(e.previousValues) : undefined,
      newValues: e.newValues ? tryParseJson(e.newValues) : undefined,
    }));
  } catch (error) {
    console.error("[BillTimeline] Failed to fetch timeline:", error);
    return [];
  }
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Build a description for common bill changes.
 */
export function buildPaymentDescription(opts: {
  amount: number;
  method?: string;
  billNumber?: string;
}): string {
  const methodStr = opts.method ? ` via ${opts.method}` : "";
  return `₹${opts.amount.toLocaleString()}${methodStr} for Bill ${opts.billNumber || ""}`;
}

export function buildChangeDescription(changes: TimelineChange[]): string {
  return changes
    .map((c) => `${c.label}: ${c.oldValue || "(empty)"} → ${c.newValue || "(empty)"}`)
    .join(", ");
}
