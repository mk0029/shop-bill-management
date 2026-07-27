import { NextResponse } from "next/server";
import { formatDayDate } from "@/lib/date-time";
import { sendAppEmail } from "@/lib/email/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { billId, billNumber, dueDate, amount, email, phone, notificationType } = body || {} as {
      billId?: string;
      billNumber?: string;
      dueDate?: string;
      amount?: number;
      email?: string;
      phone?: string;
      notificationType?: "sms" | "email" | "both";
    };

    // Validate required fields
    if (!billId || !phone && !email) {
      return NextResponse.json(
        { error: "billId and (phone or email) are required" },
        { status: 400 }
      );
    }

    const results = {
      sms: null as any,
      email: null as any,
    };

    // Send SMS reminder via Razorpay
    if ((notificationType === "sms" || notificationType === "both") && phone) {
      try {
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        const formattedDate = dueDateObj ? formatDayDate(dueDateObj) : "upcoming";
        const daysUntilDue = dueDateObj
          ? Math.ceil(
              (dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        const smsMessage = `Hi! This is a reminder for Bill #${billNumber}. Amount: ₹${amount}. Due: ${formattedDate}. Pay now at your convenience. Thank you!`;

        // Use Razorpay SMS API
        const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
          throw new Error("Razorpay credentials not configured");
        }

        const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        const smsRes = await fetch("https://api.razorpay.com/v1/notifications", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sms: {
              recipients: [phone],
              message: smsMessage,
            },
          }),
        });

        const smsJson = await smsRes.json().catch(() => ({}));
        results.sms = { success: smsRes.ok, data: smsJson };
      } catch (error: any) {
        results.sms = { success: false, error: error.message };
      }
    }

    // Send Email reminder
    if ((notificationType === "email" || notificationType === "both") && email) {
      try {
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        const formattedDate = dueDateObj ? formatDayDate(dueDateObj) : "upcoming";

        const emailResult = await sendAppEmail({
          to: email,
          subject: `Payment Reminder: Bill #${billNumber}`,
          template: "payment-reminder",
          data: {
            billNumber,
            amount,
            dueDate: formattedDate,
            billId,
          },
        });

        results.email = {
          success: emailResult.sent,
          data: emailResult.data,
          error: emailResult.reason,
        };
      } catch (error: any) {
        results.email = { success: false, error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reminder notifications sent",
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to send reminder",
        details: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
