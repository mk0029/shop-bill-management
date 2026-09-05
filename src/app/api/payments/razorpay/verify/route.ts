import { NextResponse } from "next/server";
import crypto from "crypto";
import { sanityApiService } from "@/lib/sanity-api-service";
import { emitWaEventServer } from "@/lib/wa-bot-server";
import { createDocument, updateDocument } from "@/lib/sanity/write-router";
import { fetchBillById } from "@/lib/sanity/bills-federated";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      billId,
      amount,
    } = (body || {}) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      billId?: string;
      amount?: number;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !billId) {
      return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Fetch bill to compute amounts
    const bill = await fetchBillById(billId);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const paidPrev = Number(bill.paidAmount || 0);
    const grossTotal = Number(bill.totalAmount || 0);
    const discount = Number(bill.discount || 0);
    const total = Math.max(0, grossTotal - discount);
    const add = Number(amount || 0);
    const paidNext = Math.min(total, paidPrev + (isFinite(add) && add > 0 ? add : 0));
    const balance = Math.max(0, total - paidNext);
    const paymentStatus = balance > 0 ? "partial" : "paid";

    // Create payment record (minimal)
    try {
      await createDocument({
        _type: "payment",
        bill: { _type: "reference", _ref: billId },
        gateway: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: add,
        status: "captured",
        createdAt: new Date().toISOString(),
      }, 'payments');
    } catch {}

    // Update bill
    const updated = await updateDocument(billId, {
      paidAmount: paidNext,
      balanceAmount: balance,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    }, 'bills');

    // Central WhatsApp event: payment update (fire-and-forget)
    try {
      const eventType = paymentStatus === "paid" ? "billing.payment.paid" : "billing.payment.partial";
      const updatedAt = new Date().toISOString();
      void emitWaEventServer(eventType, {
        billId,
        billNumber: bill.billNumber || billId,
        paymentId: razorpay_payment_id,
        customerId: bill.customer?._id,
        customerName: bill.customer?.name || "",
        customerPhone: bill.customer?.phone || "",
        grandTotal: total,
        totalAmount: total,
        paidNow: add,
        paidAmount: paidNext,
        totalPaid: paidNext,
        balance,
        balanceAmount: balance,
        paymentMode: "razorpay",
        paymentDate: updatedAt,
        updatedAt,
        eventId: `billing.payment.${paymentStatus}.${billId}.${razorpay_payment_id}`,
        idempotencyKey: `billing.payment.${paymentStatus === "paid" ? "paid" : "partial"}:${billId}:${razorpay_payment_id}`,
      }).then((result) => {
        if (!result.ok) console.warn("[WA] bill payment event failed", result.error);
      });
    } catch (e) {
      console.error("[WA] bill payment event dispatch failed", e);
    }
    // Create cash book entry for this payment
    try {
      if (bill.customer && add > 0) {
        const result = await sanityApiService.cashBook.createEntryFromBillPayment({
          billId: billId,
          userId: bill.customer._id,
          userName: bill.customer.name,
          amount: add,
          paymentType: 'credit',
          paymentDate: new Date().toISOString(),
          billNumber: bill.billNumber,
          totalAmount: Number(bill.totalAmount || bill.total || 0),
          paymentStatus,
        });

        if (!result.success) {
          console.error('Failed to create cash book entry:', result.error);
        }
      }
    } catch (cashBookError) {
      console.error('Failed to create cash book entry:', cashBookError);
      // Don't fail payment if cash book entry fails
    }

    return NextResponse.json({
      success: true,
      bill: { ...bill, paidAmount: paidNext, balanceAmount: balance, paymentStatus },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to verify payment", details: String(error?.message || error) }, { status: 500 });
  }
}
