/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { createDocument } from "@/lib/sanity/write-router";
import { queryDocuments } from "@/lib/sanity/read-router";
import { getServerAuth } from "@/lib/server-auth";
import { emitWaEventServer } from "@/lib/wa-bot-server";
import { billPaymentNotes } from "@/lib/sanity-api-service";
import {
  createAndDispatchNotification,
  getActiveAdminUserIds,
} from "@/services/notifications/notification-events.server";

function makeHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}


function customerDisplayName(customer: any) {
  return String(customer?.nickname || customer?.name || 'Customer').trim() || 'Customer';
}

export async function POST(req: Request) {
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
        { success: false, error: "Forbidden: Only admin can use bulk pay" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      customerId,
      billIds,
      paymentMode = "cash",
      paymentDate,
      discount = 0,
      discountReason = "",
      note = "",
    } = body || {};

    if (!customerId || !Array.isArray(billIds) || billIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "customerId and billIds[] are required" },
        { status: 400 }
      );
    }

    const actorUserId = String(auth.userId || "").trim();

    // Idempotency key
    const sortedIds = [...billIds].sort().join(",");
    const idempotencyKey = `billing.bulkPaid:${customerId}:${makeHash(sortedIds)}:${paymentDate || "today"}`;

    // Fetch all requested bills
    const billingClient = getSanityClient('billing');
    const bills = await billingClient.fetch(
      `*[_type == "bill" && _id in $billIds]{
        _id, billNumber, paymentStatus, paidAmount, balanceAmount,
        totalAmount, discount, customer->{_id, name, nickname, phone}
      }`,
      { billIds }
    );

    if (!bills || bills.length === 0) {
      return NextResponse.json(
        { success: false, error: "No bills found for the provided IDs" },
        { status: 404 }
      );
    }

    // Filter: skip already paid bills
    const billsToPay = bills.filter((b: any) => {
      const status = String(b.paymentStatus || "").toLowerCase();
      if (status === "paid") return false;
      const paid = Number(b.paidAmount || 0);
      const total = Number(b.totalAmount || 0);
      const discount = Number(b.discount || 0);
      const grandTotal = Math.max(0, total - discount);
      return paid < grandTotal;
    });

    if (billsToPay.length === 0) {
      return NextResponse.json(
        { success: false, error: "All selected bills are already fully paid" },
        { status: 400 }
      );
    }

    // Calculate totals and prepare updates
    const now = new Date().toISOString();
    const payDate = paymentDate || now;
    const bulkDiscount = Math.max(0, Number(discount || 0));
    let totalRemainingBeforeDiscount = 0;
    const billNumbers: string[] = [];
    const patchOps: Array<{ id: string; patches: any }> = [];

    // First pass: calculate total remaining before discount
    for (const bill of billsToPay) {
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const billDiscount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - billDiscount);
      const remaining = Math.max(0, grandTotal - paid);
      if (remaining > 0) {
        totalRemainingBeforeDiscount += remaining;
        billNumbers.push(bill.billNumber || bill._id);
      }
    }

    // Apply bulk discount proportionally across bills
    const discountRatio = totalRemainingBeforeDiscount > 0
      ? Math.min(bulkDiscount / totalRemainingBeforeDiscount, 1)
      : 0;
    let totalPaidAmount = 0;
    let discountApplied = 0;

    for (const bill of billsToPay) {
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const billDiscount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - billDiscount);
      const remaining = Math.max(0, grandTotal - paid);

      if (remaining <= 0) continue;

      // Proportional discount for this bill
      const billBulkDiscount = Math.round(remaining * discountRatio * 100) / 100;
      const finalPayment = Math.max(0, remaining - billBulkDiscount);
      discountApplied += billBulkDiscount;
      totalPaidAmount += finalPayment;

      patchOps.push({
        id: bill._id,
        patches: {
          paymentStatus: "paid",
          paidAmount: grandTotal,
          balanceAmount: 0,
          paymentDate: payDate,
          paymentMethod: paymentMode,
          ...(bulkDiscount > 0
            ? { discount: (billDiscount || 0) + billBulkDiscount }
            : {}),
          updatedAt: now,
        },
      });
    }

    if (patchOps.length === 0) {
      return NextResponse.json(
        { success: false, error: "No bills needed payment" },
        { status: 400 }
      );
    }

    // Execute in Sanity transaction for atomicity
    const tx = billingClient.transaction();
    for (const op of patchOps) {
      tx.patch(op.id, (p: any) => p.set(op.patches));
    }
    await tx.commit();

    // Create cashbook entries (fire-and-forget per bill)
    for (const op of patchOps) {
      const bill = billsToPay.find((b: any) => b._id === op.id);
      if (!bill) continue;
      try {
        const existingEntries = await queryDocuments(
          `*[_type == "cashBookEntry" && bill._ref == $billId][0]._id`,
          { billId: bill._id },
          'cashbook'
        );
        if (existingEntries.data && existingEntries.data.length > 0) continue;

        const total = Number(bill.total || bill.totalAmount || 0);
        const discount = Number(bill.discount || 0);
        const grandTotal = Math.max(0, total - discount);
        const paid = Number(bill.paidAmount || 0);
        const wasAlreadyFullyPaid = paid >= grandTotal;

        const notes = billPaymentNotes({
          billNumber: bill.billNumber,
          paymentStatus: wasAlreadyFullyPaid ? 'paid' : 'partial',
        });

        await createDocument({
          _type: "cashBookEntry",
          user: { _type: "reference", _ref: customerId },
          userName: bill.customer?.name || "",
          customerName: bill.customer?.name || "",
          customerId: customerId,
          amount: grandTotal,
          type: "credit",
          source: "Bill Payment",
          notes,
          bill: { _type: "reference", _ref: bill._id },
          createdAt: payDate,
          updatedAt: now,
        }, 'cashbook');
      } catch (e) {
        console.error("[PayAll] cashbook entry failed for", op.id, e);
      }
    }

    // Fetch customer info for notifications
    const customerDoc = billsToPay[0]?.customer || {};

    // ONE combined WhatsApp event (fire-and-forget)
    const waBills = billsToPay.map((bill: any) => {
      const grandTotal = Number(bill.totalAmount || 0);
      const discount = Number(bill.discount || 0);
      const netTotal = Math.max(0, grandTotal - discount);
      const alreadyPaid = Number(bill.paidAmount || 0);
      const dueAmount = Math.max(0, netTotal - alreadyPaid);
      return {
        _id: bill._id,
        billId: bill.billId || bill._id,
        billNumber: bill.billNumber || "",
        totalAmount: grandTotal,
        paidAmount: dueAmount,
        balanceAmount: 0,
        paymentStatus: "paid",
      };
    });
    void emitWaEventServer("billing.bulkPaid", {
      customerId,
      customerName: customerDisplayName(customerDoc),
      customerNickname: customerDoc.nickname || customerDisplayName(customerDoc),
      customerPhone: customerDoc.phone || "",
      customer: { name: customerDisplayName(customerDoc), nickname: customerDoc.nickname || "" },
      bills: waBills,
      totalPaid: totalPaidAmount,
      remainingBalance: 0,
      discountApplied: bulkDiscount > 0 ? discountApplied : 0,
      discountReason: bulkDiscount > 0 ? discountReason : "",
      paymentMode,
      paymentDate: payDate,
      paidByAdmin: actorUserId,
      idempotencyKey,
    }).then((result) => {
      if (!result.ok) console.warn("[WA] bulkPaid event failed:", result.error);
    }).catch((error) => {
      console.error("[WA] bulkPaid event dispatch failed:", error);
    });

    // ONE combined admin notification
    try {
      const adminUserIds = await getActiveAdminUserIds();
      if (adminUserIds.length > 0) {
        const adminRoute = `/admin/billing`;
        const discountText = discountApplied > 0 ? ` (\u20b9${discountApplied.toLocaleString()} discount applied)` : "";
        await createAndDispatchNotification({
          eventId: `billing.bulkPaid.${customerId}.${makeHash(sortedIds)}`,
          type: "billing.updated",
          actorUserId,
          userIds: adminUserIds,
          title: "Bills Paid in Bulk",
          body: `${customerDisplayName(customerDoc)} paid ${billNumbers.length} bill(s): ${billNumbers.join(", ")}. Total: \u20b9${totalPaidAmount.toLocaleString()}${discountText}.`,
          data: {
            customerId,
            billNumbers: billNumbers.join(","),
            totalPaidAmount,
            discountApplied,
            discountReason,
            paymentMode,
            route: adminRoute,
            route_path: adminRoute,
          },
          skipActor: true,
        });
      }
    } catch (e) {
      console.error("[PayAll] admin notification failed:", e);
    }

    // ONE combined customer notification
    try {
      if (customerId) {
        const customerRoute = `/customer/bills`;
        const discountText = discountApplied > 0 ? ` A discount of \u20b9${discountApplied.toLocaleString()} has been applied${discountReason ? ` (${discountReason})` : ""}.` : "";
        await createAndDispatchNotification({
          eventId: `billing.bulkPaid.${customerId}.customer.${makeHash(sortedIds)}`,
          type: "billing.updated",
          actorUserId,
          userIds: [customerId],
          title: "All Bills Paid",
          body: `Dear ${customerDisplayName(customerDoc)}, your payment has been received for ${billNumbers.length} bill(s): ${billNumbers.join(", ")}. Total Paid: \u20b9${totalPaidAmount.toLocaleString()}.${discountText} Payment Mode: ${paymentMode}. Thank you for your payment, Jambh Electricals`,
          data: {
            customerId,
            billNumbers: billNumbers.join(","),
            totalPaidAmount,
            discountApplied,
            discountReason,
            paymentMode,
            route: customerRoute,
            route_path: customerRoute,
          },
          skipActor: true,
        });
      }
    } catch (e) {
      console.error("[PayAll] customer notification failed:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: patchOps.length,
        skippedCount: bills.length - billsToPay.length,
        totalPaidAmount,
        discountApplied,
        discountReason: bulkDiscount > 0 ? discountReason : "",
        billNumbers,
        paymentMode,
        paymentDate: payDate,
      },
    });
  } catch (error) {
    console.error("[PayAll] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
