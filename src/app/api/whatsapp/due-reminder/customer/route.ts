import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import {
  calculateCustomerPendingSummary,
  canSendDueReminder,
} from "@/lib/due-reminder";
import { generatePendingBillsMessage } from "@/lib/pending-bill-share";

async function sendViaWaBotServer(phone: string, message: string) {
  const WA_BOT_URL = process.env.WA_BOT_URL;
  const WA_BOT_TOKEN = process.env.WA_BOT_TOKEN;
  const waBotBaseUrl = (WA_BOT_URL || "").replace(/\/+$/, "");
  if (!waBotBaseUrl || !WA_BOT_TOKEN) {
    throw new Error("WhatsApp bot config missing (WA_BOT_URL/WA_BOT_TOKEN)");
  }

  const res = await fetch(`${waBotBaseUrl}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": WA_BOT_TOKEN,
    },
    body: JSON.stringify({ phone, message }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `WhatsApp send failed (${res.status})`);
  }
  return json;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const previewOnly = Boolean(body?.previewOnly);
    if (!customerId) {
      return NextResponse.json({ success: false, error: "customerId is required" }, { status: 400 });
    }

    const customer = await sanityClient.fetch(
      `*[_type == "user" && (_id == $id || customerId == $id)][0]{
        _id, customerId, secretKey, name, phone,
        reminderLimit, allowDueReminder, lastDueReminderSentAt, lastDueReminderAmount
      }`,
      { id: customerId },
    );
    if (!customer?._id) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const bills = await sanityClient.fetch(
      `*[_type == "bill" && (
        customer._ref == $id ||
        customer._id == $id ||
        customer->customerId == $id ||
        customer->_id == $id
      )]{
        _id, billNumber, paymentStatus, status, totalAmount, paidAmount, balanceAmount, dueDate,
        serviceType, serviceDate, createdAt, notes,
        technician->{name},
        "items": items[]{
          name, qty, quantity, rate, price, totalPrice, amount,
          "productName": product->name
        }
      }`,
      { id: customer._id },
    );

    const summary = calculateCustomerPendingSummary(
      (bills || []).map((b: any) => ({
        billId: String(b?._id || ""),
        billNumber: b?.billNumber,
        paymentStatus: b?.paymentStatus,
        status: b?.status,
        totalAmount: Number(b?.totalAmount || 0),
        paidAmount: Number(b?.paidAmount || 0),
        balanceAmount: typeof b?.balanceAmount === "number" ? Number(b.balanceAmount) : undefined,
        dueDate: b?.dueDate,
      })),
    );

    const eligibility = canSendDueReminder({
      allowDueReminder: customer.allowDueReminder ?? true,
      reminderLimit: customer.reminderLimit,
      totalPendingAmount: summary.totalPendingAmount,
      pendingBillsCount: summary.pendingBillsCount,
      phone: customer.phone,
      lastDueReminderSentAt: customer.lastDueReminderSentAt,
      lastDueReminderAmount: customer.lastDueReminderAmount,
    });

    const detailedPendingBills = (bills || [])
      .filter((b: any) => {
        const paymentStatus = String(b?.paymentStatus || "").toLowerCase();
        const status = String(b?.status || "").toLowerCase();
        if (status === "cancelled" || status === "deleted") return false;
        return paymentStatus === "pending" || paymentStatus === "partial";
      })
      .map((b: any) => {
        const total = Number(b?.totalAmount || 0);
        const paid = Number(b?.paidAmount || 0);
        const pendingAmount =
          typeof b?.balanceAmount === "number"
            ? Math.max(0, Number(b.balanceAmount))
            : Math.max(0, total - paid);

        const items = Array.isArray(b?.items)
          ? b.items.map((it: any) => {
              const qty = it?.qty ?? it?.quantity;
              const rate = it?.rate ?? it?.price;
              const lineAmount =
                it?.totalPrice ?? it?.amount ?? (Number(qty || 0) * Number(rate || 0));
              return {
                name: it?.name || it?.productName,
                qty: typeof qty === "number" ? qty : undefined,
                rate: typeof rate === "number" ? rate : undefined,
                amount: typeof lineAmount === "number" ? lineAmount : undefined,
              };
            })
          : undefined;

        return {
          billId: String(b?._id || ""),
          billNumber: b?.billNumber,
          amount: pendingAmount,
          service: b?.serviceType,
          serviceDate: b?.serviceDate,
          createdAt: b?.createdAt,
          note: b?.notes,
          technician: b?.technician?.name ? { name: b.technician.name } : undefined,
          items,
        };
      })
      .filter((b: any) => Number(b.amount || 0) > 0);

    const message = generatePendingBillsMessage({
      customer: { name: customer.name, phone: customer.phone },
      pendingBillsCount: summary.pendingBillsCount,
      pendingAmount: summary.totalPendingAmount,
      currency: "₹",
      customerAuth: { secretKey: customer.secretKey },
      pendingBills: detailedPendingBills,
    });

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        eligibility,
        summary,
        message,
      });
    }

    if (!eligibility.ok) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: eligibility.reason,
        eligibility,
        summary,
        message,
      });
    }

    await sendViaWaBotServer(String(customer.phone), message);

    await sanityClient
      .patch(customer._id)
      .set({
        lastDueReminderSentAt: new Date().toISOString(),
        lastDueReminderAmount: Number(summary.totalPendingAmount || 0),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      sent: true,
      summary,
      eligibility,
      message,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process due reminder",
      },
      { status: 500 },
    );
  }
}
