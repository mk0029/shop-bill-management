import { NextRequest, NextResponse } from "next/server";
import { emitWaEventServer } from "@/lib/wa-bot-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const billId = String(body?.billId || "").trim();
    const phone = String(body?.phone || "").replace(/\D/g, "");
    const customerName = String(body?.customerName || "Customer");
    const previewOnly = Boolean(body?.previewOnly);

    if (!customerId && !billId) {
      return NextResponse.json({ success: false, error: "customerId or billId is required" }, { status: 400 });
    }

    if (previewOnly) {
      return NextResponse.json({ success: true, previewOnly: true, message: "Preview is handled by the local engine." });
    }

    if (!phone) {
      return NextResponse.json({ success: false, error: "Customer phone number is required" }, { status: 400 });
    }

    const bills = body.bills || (billId ? [{ _id: billId, billNumber: body.billNumber, totalAmount: body.totalAmount, paidAmount: body.paidAmount, balanceAmount: body.balanceAmount, dueDate: body.dueDate }] : []);
    const result = await emitWaEventServer("billing.reminder", {
      customerId, billId, customerName, customerPhone: phone, bills,
      eventId: `billing.reminder.${billId || customerId}`,
    });

    return NextResponse.json({ success: result.ok, ...(result.error ? { error: result.error } : {}) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to process due reminder" }, { status: 500 });
  }
}
