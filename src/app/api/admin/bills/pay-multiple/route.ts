/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { emitWaEventServer } from "@/lib/wa-bot-server";
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

function getDueAmount(bill: any): number {
  const paid = Number(bill.paidAmount || 0);
  const total = Number(bill.totalAmount || 0);
  const discount = Number(bill.discount || 0);
  const grandTotal = Math.max(0, total - discount);
  return Math.max(0, grandTotal - paid);
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
        { success: false, error: "Forbidden: Only admin can use multi-pay" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      customerId,
      billIds,
      paymentMode = "cash",
      paymentDate,
      customAmountEnabled = false,
      receivedAmount = 0,
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
    const idempotencyKey = `billing.multiPaid:${customerId}:${makeHash(sortedIds)}:${receivedAmount}:${paymentDate || "today"}`;

    // Fetch all requested bills
    const bills = await sanityClient.fetch(
      `*[_type == "bill" && _id in $billIds]{
        _id, billNumber, paymentStatus, paidAmount, balanceAmount,
        totalAmount, discount, serviceDate, createdAt,
        customer->{_id, name, nickname, phone}
      }`,
      { billIds }
    );

    if (!bills || bills.length === 0) {
      return NextResponse.json(
        { success: false, error: "No bills found for the provided IDs" },
        { status: 404 }
      );
    }

    // Filter: skip already paid bills, sort oldest first
    const billsToPay = bills
      .filter((b: any) => getDueAmount(b) > 0)
      .sort((a: any, b: any) => {
        const da = new Date(a.serviceDate || a.createdAt || 0).getTime();
        const db = new Date(b.serviceDate || b.createdAt || 0).getTime();
        return da - db;
      });

    if (billsToPay.length === 0) {
      return NextResponse.json(
        { success: false, error: "All selected bills are already fully paid" },
        { status: 400 }
      );
    }

    const totalPending = billsToPay.reduce((sum: number, b: any) => sum + getDueAmount(b), 0);
    const now = new Date().toISOString();
    const payDate = paymentDate || now;

    // Distribution logic
    let remainingAmount = customAmountEnabled
      ? Math.min(Math.max(0, Number(receivedAmount || 0)), totalPending)
      : totalPending;

    const fullyPaidBills: string[] = [];
    let partialBillNumber: string | null = null;
    let partialApplied = 0;
    let totalApplied = 0;
    const patchOps: Array<{ id: string; patches: any; amount: number }> = [];
    const notes: string[] = [];

    for (const bill of billsToPay) {
      if (remainingAmount <= 0) break;

      const due = getDueAmount(bill);
      const applied = Math.min(remainingAmount, due);
      if (applied <= 0) continue;

      const newPaid = Number(bill.paidAmount || 0) + applied;
      const newDue = Math.max(0, due - applied);
      const isFullyPaid = newDue <= 0.01;
      const total = Number(bill.totalAmount || 0);
      const discount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - discount);

      patchOps.push({
        id: bill._id,
        amount: applied,
        patches: {
          paidAmount: newPaid,
          balanceAmount: Math.round(newDue * 100) / 100,
          paymentStatus: isFullyPaid ? "paid" : "partial",
          paymentDate: payDate,
          paymentMethod: paymentMode,
          updatedAt: now,
        },
      });

      if (isFullyPaid) {
        fullyPaidBills.push(bill.billNumber || bill._id);
        notes.push(`Fully paid ${bill.billNumber || bill._id} with \u20b9${applied.toLocaleString()}`);
      } else {
        partialBillNumber = bill.billNumber || bill._id;
        partialApplied = applied;
        notes.push(`Partially paid ${bill.billNumber || bill._id} with \u20b9${applied.toLocaleString()} (\u20b9${newDue.toLocaleString()} remaining)`);
      }

      totalApplied += applied;
      remainingAmount -= applied;
    }

    if (patchOps.length === 0) {
      return NextResponse.json(
        { success: false, error: "No bills needed payment" },
        { status: 400 }
      );
    }

    // Generate smart note
    const smartNote = note || [
      `Received \u20b9${(customAmountEnabled ? Number(receivedAmount) : totalPending).toLocaleString()} from customer.`,
      `Auto-adjusted against oldest pending bills.`,
      fullyPaidBills.length > 0 ? `Fully paid: ${fullyPaidBills.join(", ")}.` : "",
      partialBillNumber ? `Partially paid ${partialBillNumber} with \u20b9${partialApplied.toLocaleString()}.` : "",
      remainingAmount > 0.01 ? `\u20b9${remainingAmount.toLocaleString()} unapplied (exceeds total pending).` : "",
    ].filter(Boolean).join(" ");

    // Execute in Sanity transaction
    const tx = sanityClient.transaction();
    for (const op of patchOps) {
      tx.patch(op.id, (p: any) => p.set(op.patches));
    }
    await tx.commit();

    // Create cashbook entries (fire-and-forget)
    for (const op of patchOps) {
      const bill = billsToPay.find((b: any) => b._id === op.id);
      if (!bill) continue;
      try {
        await sanityClient.create({
          _type: "cashBookEntry",
          user: { _type: "reference", _ref: customerId },
          userName: bill.customer?.name || "",
          amount: op.amount,
          type: "credit",
          source: "Bill Payment",
          bill: { _type: "reference", _ref: bill._id },
          createdAt: payDate,
          updatedAt: now,
        });
      } catch (e) {
        console.error("[PayMultiple] cashbook entry failed for", op.id, e);
      }
    }

    const customerDoc = billsToPay[0]?.customer || {};
    const remainingBalance = Math.max(0, totalPending - totalApplied);

    // ONE combined WhatsApp event (fire-and-forget)
    const waBills = patchOps.map((op) => {
      const bill = billsToPay.find((b: any) => b._id === op.id);
      return {
        _id: op.id,
        billId: bill?.billId || op.id,
        billNumber: bill?.billNumber || "",
        totalAmount: bill?.totalAmount || 0,
        paidAmount: op.amount,
        balanceAmount: Math.max(0, (bill?.balanceAmount ?? bill?.totalAmount ?? 0) - op.amount),
        paymentStatus: op.patches?.paymentStatus || "partial",
      };
    });
    void emitWaEventServer("billing.multiPaid", {
      customerId,
      customerName: customerDisplayName(customerDoc),
      customerNickname: customerDoc.nickname || customerDisplayName(customerDoc),
      customerPhone: customerDoc.phone || "",
      customer: { name: customerDisplayName(customerDoc), nickname: customerDoc.nickname || "" },
      bills: waBills,
      totalPaid: totalApplied,
      remainingBalance,
      paymentMode,
      paymentDate: payDate,
      paidByAdmin: actorUserId,
      idempotencyKey,
    }).then((result) => {
      if (!result.ok) console.warn("[WA] multiPaid event failed:", result.error);
    }).catch((error) => {
      console.error("[WA] multiPaid event dispatch failed:", error);
    });

    // ONE combined admin notification
    try {
      const adminUserIds = await getActiveAdminUserIds();
      if (adminUserIds.length > 0) {
        const adminRoute = `/admin/billing`;
        const partialText = partialBillNumber ? ` Partial: ${partialBillNumber} (\u20b9${partialApplied.toLocaleString()}).` : "";
        await createAndDispatchNotification({
          eventId: `billing.multiPaid.${customerId}.${makeHash(sortedIds)}.${receivedAmount}`,
          type: "billing.updated",
          actorUserId,
          userIds: adminUserIds,
          title: "Payment Applied Across Bills",
          body: `${customerDisplayName(customerDoc)} \u2014 \u20b9${totalApplied.toLocaleString()} applied across ${patchOps.length} bill(s). Fully paid: ${fullyPaidBills.join(", ") || "none"}.${partialText}`,
          data: {
            customerId,
            billNumbersFullyPaid: fullyPaidBills.join(","),
            billNumberPartiallyPaid: partialBillNumber || "",
            totalApplied,
            paymentMode,
            route: adminRoute,
            route_path: adminRoute,
          },
          skipActor: true,
        });
      }
    } catch (e) {
      console.error("[PayMultiple] admin notification failed:", e);
    }

    // ONE combined customer notification
    try {
      if (customerId) {
        const customerRoute = `/customer/bills`;
        const partialText = partialBillNumber ? `Partially paid: ${partialBillNumber} \u2014 \u20b9${partialApplied.toLocaleString()} applied.` : "";
        const remainingText = remainingBalance > 0 ? `Remaining balance: \u20b9${remainingBalance.toLocaleString()}.` : "";
        await createAndDispatchNotification({
          eventId: `billing.multiPaid.${customerId}.customer.${makeHash(sortedIds)}.${receivedAmount}`,
          type: "billing.updated",
          actorUserId,
          userIds: [customerId],
          title: "Payment Adjusted",
          body: `Dear ${customerDisplayName(customerDoc)}, we have received your payment of \u20b9${(customAmountEnabled ? Number(receivedAmount) : totalPending).toLocaleString()}. It has been adjusted against your pending bills. Fully Paid: ${fullyPaidBills.join(", ") || "None"}. ${partialText} ${remainingText} Payment Mode: ${paymentMode}. Thank you for your payment. Regards, Jambh Electricals`,
          data: {
            customerId,
            billNumbersFullyPaid: fullyPaidBills.join(","),
            billNumberPartiallyPaid: partialBillNumber || "",
            totalReceived: customAmountEnabled ? Number(receivedAmount) : totalPending,
            totalApplied,
            remainingCustomerBalance: remainingBalance,
            paymentMode,
            route: customerRoute,
            route_path: customerRoute,
          },
          skipActor: true,
        });
      }
    } catch (e) {
      console.error("[PayMultiple] customer notification failed:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: patchOps.length,
        skippedCount: bills.length - billsToPay.length,
        fullyPaidBills,
        partiallyPaidBill: partialBillNumber,
        partialApplied,
        totalReceived: customAmountEnabled ? Number(receivedAmount) : totalPending,
        totalApplied,
        remainingBalance,
        smartNote,
        paymentMode,
        paymentDate: payDate,
      },
    });
  } catch (error) {
    console.error("[PayMultiple] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
