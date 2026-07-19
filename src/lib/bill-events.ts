/* eslint-disable @typescript-eslint/no-explicit-any */
import { emitWaEventServer } from "@/lib/wa-bot-server";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: unknown): string {
  return String(v ?? "").trim();
}

function resolvePaymentEventType(input: {
  previousPaid: number;
  nextPaid: number;
  grandTotal: number;
  previousStatus?: string;
  nextStatus?: string;
}): string | null {
  const previousStatus = toStr(input.previousStatus).toLowerCase();
  const nextStatus = toStr(input.nextStatus).toLowerCase();
  const delta = input.nextPaid - input.previousPaid;
  if (delta < 0) return "billing.payment.removed";
  if (input.nextPaid <= 0) return null;
  if (delta === 0) return previousStatus !== nextStatus ? "billing.payment.updated" : null;
  if (input.nextPaid >= input.grandTotal) return previousStatus === "paid" ? null : "billing.payment.paid";
  return "billing.payment.partial";
}

interface ResolvedBillEvent {
  type: string;
  payload: Record<string, unknown>;
}

export function resolveBillEvents(
  prev: any,
  next: any,
  body: Record<string, any> = {},
): ResolvedBillEvent[] {
  if (!prev || !next) return [];
  const events: ResolvedBillEvent[] = [];
  const billId = String(next._id || prev._id || "");
  const updatedAt = new Date().toISOString();

  const prevPaid = toNum(prev.paidAmount);
  const nextPaid = toNum(next.paidAmount);
  const prevPayStatus = toStr(prev.paymentStatus);
  const nextPayStatus = toStr(next.paymentStatus);
  const prevBalance = toNum(prev.balanceAmount);
  const nextBalance = toNum(next.balanceAmount);
  const prevDiscount = toNum(prev.discount);
  const nextDiscount = toNum(next.discount);
  const prevStatus = toStr(prev.status);
  const nextStatus = toStr(next.status);
  const grossTotal = toNum(next.totalAmount || prev.totalAmount);
  const grandTotal = Math.max(0, grossTotal - nextDiscount);

  const paymentChanged = prevPayStatus !== nextPayStatus || prevPaid !== nextPaid || prevBalance !== nextBalance;
  const discountChanged = prevDiscount !== nextDiscount;
  const statusChanged = prevStatus !== nextStatus;

  if (paymentChanged) {
    const paymentEventType = resolvePaymentEventType({
      previousPaid: prevPaid,
      nextPaid,
      grandTotal,
      previousStatus: prev.paymentStatus,
      nextStatus: next.paymentStatus,
    });
    if (paymentEventType) {
      const paymentDelta = nextPaid - prevPaid;
      const paymentId = String(body.paymentId || body.transactionId || `bill-update:${billId}:${Math.abs(paymentDelta) || nextPaid}:${updatedAt}`);
      events.push({
        type: paymentEventType,
        payload: {
          billId,
          billNumber: next.billNumber || prev.billNumber || "",
          paymentId,
          customerId: next.customer?._id || prev.customer?._id,
          customerName: next.customer?.name || prev.customer?.name || "",
          customerPhone: next.customer?.phone || prev.customer?.phone || "",
          grossTotal,
          grandTotal,
          totalAmount: grossTotal,
          discount: nextDiscount,
          paidNow: Math.max(0, paymentDelta),
          paidAmount: nextPaid,
          totalPaid: nextPaid,
          balance: nextBalance,
          balanceAmount: nextBalance,
          paymentMode: body.paymentMode || body.paymentMethod || next.paymentMethod || "manual",
          paymentDate: next.paymentDate || updatedAt,
          updatedAt,
          eventId: `${paymentEventType}.${billId}.${paymentId}`,
          idempotencyKey: paymentEventType === "billing.payment.updated"
            ? `${paymentEventType}:${billId}:${paymentId}:${updatedAt}`
            : `${paymentEventType}:${billId}:${paymentId}`,
        },
      });
    }
  }

  if ((discountChanged || statusChanged) && !paymentChanged) {
    events.push({
      type: "billing.updated",
      payload: {
        billId,
        billNumber: next.billNumber || prev.billNumber || "",
        customerId: next.customer?._id || prev.customer?._id,
        customerName: next.customer?.name || prev.customer?.name || "",
        customerPhone: next.customer?.phone || prev.customer?.phone || "",
        totalAmount: grossTotal,
        discount: nextDiscount,
        finalTotal: grandTotal,
        balanceAmount: nextBalance,
        status: nextStatus || prevStatus,
        paymentStatus: nextPayStatus || prevPayStatus,
        serviceType: next.serviceType || prev.serviceType || "",
        dueDate: next.dueDate || prev.dueDate || "",
        technicianName: next.technician?.name || prev.technician?.name || "",
        updatedAt,
        eventId: `billing.updated.${billId}.${updatedAt}`,
        idempotencyKey: `billing.updated:${billId}:${updatedAt}`,
      },
    });
  }

  return events;
}

export function emitBillEventsInBackground(events: ResolvedBillEvent[]) {
  for (const event of events) {
    void emitWaEventServer(event.type, event.payload).then((result) => {
      if (!result.ok) console.warn("[WA] bill event failed", event.type, result.error);
      else if (result.skipped) console.warn("[WA] bill event skipped (no recipient phone)", event.type, { billId: event.payload.billId });
    }).catch((error) => {
      console.error("[WA] bill event dispatch failed", event.type, error);
    });
  }
}
