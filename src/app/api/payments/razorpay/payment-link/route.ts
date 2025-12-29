import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      billId,
      billNumber,
      dueDate,
      amount,
      email,
      phone,
      customerName,
    } = body || {} as {
      billId?: string;
      billNumber?: string;
      dueDate?: string;
      amount?: number;
      email?: string;
      phone?: string;
      customerName?: string;
    };

    if (!billId || !amount || !email || !phone) {
      return NextResponse.json(
        {
          error:
            "billId, amount, email, and phone are required",
        },
        { status: 400 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys not configured" },
        { status: 500 }
      );
    }

    const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    // Create payment link with Razorpay
    const paymentLinkRes = await fetch(
      "https://api.razorpay.com/v1/payment_links",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency: "INR",
          accept_partial: true,
          first_min_partial_amount: 100,
          reference_id: String(billId),
          description: `Payment for Bill #${billNumber}`,
          customer_notify: 1, // Enable notifications
          notify: {
            sms: true, // Enable SMS notifications
            email: true, // Enable email notifications
          },
          reminder_enable: true, // Enable reminders (uses your dashboard settings)
          notes: {
            billId: String(billId),
            billNumber: billNumber,
            dueDate: dueDate,
          },
          upi_link: true,
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/payments/razorpay/callback`,
          callback_method: "get",
          contact: phone,
          email: email,
        }),
      }
    );

    const linkJson = await paymentLinkRes.json().catch(() => ({}));

    if (!paymentLinkRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to create payment link",
          details: linkJson,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentLink: linkJson.short_url || linkJson.url,
      fullLink: linkJson,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create payment link",
        details: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
