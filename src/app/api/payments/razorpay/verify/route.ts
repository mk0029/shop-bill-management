import { NextResponse } from "next/server";
import crypto from "crypto";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";

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
    const bill = await sanityClient.fetch(`*[_type == "bill" && _id == $id][0]{ _id, totalAmount, paidAmount, discount, customer->{_id, name, phone, email} }`, { id: billId });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const paidPrev = Number(bill.paidAmount || 0);
    const total = Number(bill.totalAmount || 0);
    const add = Number(amount || 0);
    const paidNext = Math.min(total, paidPrev + (isFinite(add) && add > 0 ? add : 0));
    const balance = Math.max(0, total - paidNext);
    const paymentStatus = balance > 0 ? "partial" : "paid";

    // Create payment record (minimal)
    try {
      await sanityClient.create({
        _type: "payment",
        bill: { _type: "reference", _ref: billId },
        gateway: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: add,
        status: "captured",
        createdAt: new Date().toISOString(),
      });
    } catch {}

    // Update bill
    const updated = await sanityClient.patch(billId)
      .set({ paidAmount: paidNext, balanceAmount: balance, paymentStatus, updatedAt: new Date().toISOString() })
      .commit();

    // Create cash book entry for this payment
    try {
      console.log('Creating cash book entry for payment:', {
        billId,
        customer: bill.customer,
        amount: add,
        paymentType: 'credit'
      });
      
      if (bill.customer && add > 0) {
        const result = await sanityApiService.cashBook.createEntryFromBillPayment({
          billId: billId,
          userId: bill.customer._id,
          userName: bill.customer.name,
          amount: add,
          paymentType: 'credit'
        });
        
        console.log('Cash book entry creation result:', result);
        
        if (!result.success) {
          console.error('Failed to create cash book entry:', result.error);
        }
      } else {
        console.log('No customer data or zero amount, skipping cash book entry');
      }
    } catch (cashBookError) {
      console.error('Failed to create cash book entry:', cashBookError);
      // Don't fail payment if cash book entry fails
    }

    return NextResponse.json({ success: true, bill: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to verify payment", details: String(error?.message || error) }, { status: 500 });
  }
}
