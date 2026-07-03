import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { sanityClient } from "@/lib/sanity";
import { sendViaWaBotServer } from "@/lib/wa-bot-server";
import { notificationTemplates, formatCustomerName } from "@/lib/notifications/template-engine";

const RATE_LIMIT_MS = 5 * 60 * 1000;
const manualSendTimestamps = new Map<string, number>();

type SendStatus = "sent" | "failed";
type ShareType = "bill" | "payment" | "customer" | "work_request" | "reminder";

type CustomerDoc = {
  _id: string;
  customerId?: string;
  name?: string;
  nickname?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  whatsappNumber?: string;
  location?: string;
};

type BillDoc = {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  dueDate?: string;
  createdAt?: string;
  serviceType?: string;
  technicianName?: string;
  technician?: string;
  serviceName?: string;
  notes?: string;
  note?: string;
  items?: Array<{ name?: string; description?: string; price?: number }>;
};

type WorkRequestDoc = {
  _id: string;
  requestId?: string;
  title?: string;
  serviceType?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
};

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}


function eventTypeForShareType(shareType: ShareType) {
  const map: Record<ShareType, string> = {
    bill: "manual_bill_share",
    payment: "manual_payment_share",
    customer: "manual_customer_share",
    work_request: "manual_work_request_share",
    reminder: "manual_reminder_share",
  };
  return map[shareType];
}

function relatedEntityTypeForShareType(shareType: ShareType) {
  if (shareType === "bill" || shareType === "payment" || shareType === "reminder") return "bill";
  if (shareType === "work_request") return "work_request";
  return "customer";
}

function rateLimitKey(customerId: string, shareType: ShareType, entityId?: string) {
  return `${shareType}:${customerId}:${entityId || "customer"}`;
}

function isRateLimited(customerId: string, shareType: ShareType, entityId: string | undefined, forceResend: boolean) {
  if (forceResend) return false;
  const key = rateLimitKey(customerId, shareType, entityId);
  const lastSent = manualSendTimestamps.get(key);
  return Boolean(lastSent && Date.now() - lastSent < RATE_LIMIT_MS);
}

function markSent(customerId: string, shareType: ShareType, entityId?: string) {
  manualSendTimestamps.set(rateLimitKey(customerId, shareType, entityId), Date.now());
}

async function wasSentRecently(customerId: string, shareType: ShareType, entityId?: string) {
  const since = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
  const eventType = eventTypeForShareType(shareType);
  const existing = await sanityClient.fetch<{ _id: string } | null>(
    `*[
      _type == "whatsAppEventLog" &&
      eventType == $eventType &&
      status == "sent" &&
      customerId == $customerId &&
      relatedEntityId == $relatedEntityId &&
      createdAt >= $since
    ][0]{_id}`,
    { eventType, customerId, relatedEntityId: entityId || customerId, since },
  );
  return Boolean(existing?._id);
}

async function createAuditLog(input: {
  senderAdminId: string | null;
  senderRole: string | null;
  customer: CustomerDoc | null;
  customerId: string;
  shareType: ShareType;
  entityId?: string;
  status: SendStatus;
  failureReason?: string;
  result?: unknown;
}) {
  const now = new Date().toISOString();
  const eventType = eventTypeForShareType(input.shareType);
  const doc = {
    _type: "whatsAppEventLog",
    eventType,
    templateName: eventType,
    recipientName: input.customer ? formatCustomerName(input.customer) : "Customer",
    recipientPhone: normalizePhone(
      input.customer?.whatsappNumber ||
        input.customer?.whatsapp ||
        input.customer?.mobile ||
        input.customer?.phone,
    ),
    relatedEntityType: relatedEntityTypeForShareType(input.shareType),
    relatedEntityId: input.entityId || input.customerId,
    idempotencyKey: `manual:${eventType}:${input.customerId}:${input.entityId || "customer"}:${Date.now()}`,
    status: input.status,
    errorMessage: input.failureReason || "",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    sentAt: input.status === "sent" ? now : undefined,
    senderAdminId: input.senderAdminId,
    senderRole: input.senderRole,
    customerId: input.customerId,
    billId: input.shareType === "bill" || input.shareType === "payment" || input.shareType === "reminder" ? input.entityId || "" : "",
    messageType: eventType,
    shareType: input.shareType,
    payload: JSON.stringify(input.result || {}),
  };

  try {
    await sanityClient.create(doc);
  } catch (error) {
    console.error("[manual-whatsapp] audit log create failed", error);
  }
}

async function getCustomer(customerId: string) {
  return sanityClient.fetch<CustomerDoc | null>(
    `*[_type == "user" && role == "customer" && (_id == $customerId || customerId == $customerId)][0]{
      _id, customerId, name, nickname, phone, mobile, whatsapp, whatsappNumber, location
    }`,
    { customerId },
  );
}

async function getBill(billId: string, customerId: string) {
  return sanityClient.fetch<BillDoc | null>(
    `*[_type == "bill" && (_id == $billId || billId == $billId) && (
      customer._ref == $customerId || customerId == $customerId || customer._id == $customerId
    )][0]{
      _id, billNumber, totalAmount, paidAmount, balanceAmount, paymentStatus, dueDate, createdAt, serviceType, technicianName, notes, items
    }`,
    { billId, customerId },
  );
}

async function getBillById(billId: string) {
  return sanityClient.fetch<{ _id: string; customerId?: string; customer?: { _ref?: string; _id?: string } } | null>(
    `*[_type == "bill" && (_id == $billId || billId == $billId)][0]{
      _id, customerId, "customer": customer { _ref, _id }
    }`,
    { billId },
  );
}

async function getCustomerPendingBills(customerId: string) {
  return sanityClient.fetch<BillDoc[]>(
    `*[_type == "bill" && (customer._ref == $customerId || customerId == $customerId || customer._id == $customerId) && paymentStatus != "paid"] | order(createdAt desc)[0...10]{
      _id, billNumber, totalAmount, paidAmount, balanceAmount, paymentStatus, dueDate, createdAt, serviceType, technicianName, notes, items
    }`,
    { customerId },
  );
}

async function getWorkRequest(workRequestId: string, customerId: string) {
  return sanityClient.fetch<WorkRequestDoc | null>(
    `*[_type in ["repairRequest", "workTask"] && (_id == $workRequestId || requestId == $workRequestId) && (
      customer._ref == $customerId || customerId == $customerId || user._ref == $customerId
    )][0]{
      _id, requestId, title, serviceType, status, priority, createdAt
    }`,
    { workRequestId, customerId },
  );
}

function renderBillShareTemplate(customer: CustomerDoc, bill: BillDoc) {
  return notificationTemplates.paymentReminder({ customer, bills: [bill] });
}

function renderPaymentShareTemplate(customer: CustomerDoc, bill: BillDoc) {
  return notificationTemplates.paymentReceived({ customer, bill });
}

function renderCustomerShareTemplate(customer: CustomerDoc) {
  return notificationTemplates.customerDetails({ customer });
}

function renderReminderShareTemplate(customer: CustomerDoc, bills: BillDoc[]) {
  return notificationTemplates.paymentReminder({ customer, bills });
}

function renderWorkRequestShareTemplate(customer: CustomerDoc, request: WorkRequestDoc) {
  return notificationTemplates.workRequest({ customer, request });
}
async function buildTemplate(input: {
  shareType: ShareType;
  customer: CustomerDoc;
  customerId: string;
  billId?: string;
  paymentId?: string;
  workRequestId?: string;
}) {
  if (input.shareType === "bill") {
    if (!input.billId) throw new Error("billId is required for bill share");
    const bill = await getBill(input.billId, input.customerId);
    if (!bill?._id) throw new Error("Bill not found for selected customer");
    return { message: renderBillShareTemplate(input.customer, bill), entityId: bill._id };
  }

  if (input.shareType === "payment") {
    if (!input.billId) throw new Error("billId is required for payment share");
    const bill = await getBill(input.billId, input.customerId);
    if (!bill?._id) throw new Error("Bill not found for selected customer");
    return { message: renderPaymentShareTemplate(input.customer, bill), entityId: bill._id };
  }

  if (input.shareType === "work_request") {
    if (!input.workRequestId) throw new Error("workRequestId is required for work request share");
    const request = await getWorkRequest(input.workRequestId, input.customerId);
    if (!request?._id) throw new Error("Work request not found for selected customer");
    return { message: renderWorkRequestShareTemplate(input.customer, request), entityId: request._id };
  }

  if (input.shareType === "reminder") {
    const bills = await getCustomerPendingBills(input.customerId);
    if (!bills.length) throw new Error("No pending bills found for selected customer");
    return { message: renderReminderShareTemplate(input.customer, bills), entityId: input.customerId };
  }

  return { message: renderCustomerShareTemplate(input.customer), entityId: input.customerId };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "admin" && auth.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only Admin and Super Admin can send WhatsApp messages" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const shareType = String(body.shareType || "").trim() as ShareType;
    const validShareTypes: ShareType[] = ["bill", "payment", "customer", "work_request", "reminder"];

    console.log("[manual-whatsapp] Incoming Request:", {
      billId: body.billId,
      customerId: body.customerId,
      shareType,
      adminId: auth.userId,
      role: auth.role,
    });

    if (!validShareTypes.includes(shareType)) {
      return NextResponse.json({ success: false, error: "Valid shareType is required" }, { status: 400 });
    }

    const customerId = String(body.customerId || "").trim();
    const billId = String(body.billId || "").trim() || undefined;
    const paymentId = String(body.paymentId || "").trim() || undefined;
    const workRequestId = String(body.workRequestId || "").trim() || undefined;
    const forceResend = auth.role === "super_admin" && Boolean(body.forceResend);

    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer ID is required" }, { status: 400 });
    }

    const customer = await getCustomer(customerId);
    console.log("[manual-whatsapp] Customer Found:", customer ? { _id: customer._id, name: formatCustomerName(customer) } : null);

    if (!customer?._id) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    if ((shareType === "bill" || shareType === "payment") && billId) {
      const billLookup = await getBillById(billId);
      if (!billLookup?._id) {
        return NextResponse.json({ success: false, error: "Bill not found." }, { status: 404 });
      }
      const billCustomerId = billLookup.customerId || billLookup.customer?._ref || billLookup.customer?._id;
      if (billCustomerId && billCustomerId !== customer._id && billCustomerId !== customer.customerId) {
        return NextResponse.json(
          { success: false, error: "Bill does not belong to the selected customer." },
          { status: 400 },
        );
      }
      console.log("[manual-whatsapp] Bill Found:", { _id: billLookup._id, customerId: billCustomerId });
    }

    const phone = normalizePhone(
      customer.whatsappNumber || customer.whatsapp || customer.mobile || customer.phone,
    );
    console.log("[manual-whatsapp] Phone Number:", phone || "MISSING");

    if (!phone) {
      await createAuditLog({
        senderAdminId: auth.userId,
        senderRole: auth.role,
        customer,
        customerId: customer._id,
        shareType,
        entityId: billId || workRequestId || customer._id,
        status: "failed",
        failureReason: "Customer does not have a WhatsApp number",
      });
      return NextResponse.json(
        { success: false, error: "Customer does not have a WhatsApp number." },
        { status: 400 },
      );
    }

    const template = await buildTemplate({
      shareType,
      customer,
      customerId: customer._id,
      billId,
      paymentId,
      workRequestId,
    });
    const entityId = template.entityId;
    console.log("[manual-whatsapp] Generated Template:", { eventType: eventTypeForShareType(shareType) });

    if (isRateLimited(customer._id, shareType, entityId, forceResend) || await wasSentRecently(customer._id, shareType, entityId)) {
      await createAuditLog({
        senderAdminId: auth.userId,
        senderRole: auth.role,
        customer,
        customerId: customer._id,
        shareType,
        entityId,
        status: "failed",
        failureReason: "Rate limit: one manual WhatsApp message per customer/bill every 5 minutes",
      });
      return NextResponse.json(
        {
          success: false,
          rateLimited: true,
          error: "One manual WhatsApp message per customer/bill is allowed every 5 minutes",
        },
        { status: 429 },
      );
    }

    const eventType = eventTypeForShareType(shareType);
    console.log("[manual-whatsapp] WhatsApp Send Started:", { phone: phone.slice(0, 4) + "****", eventType });

    const result = await sendViaWaBotServer({
      phone,
      message: template.message,
      eventType,
    });

    if (!result.ok || result.failed > 0) {
      const reason = result.error || result.results?.find((item) => !item.ok)?.error || "WhatsApp send failed";
      console.log("[manual-whatsapp] WhatsApp Send Failed:", { reason });
      await createAuditLog({
        senderAdminId: auth.userId,
        senderRole: auth.role,
        customer,
        customerId: customer._id,
        shareType,
        entityId,
        status: "failed",
        failureReason: reason,
        result,
      });
      return NextResponse.json({ success: false, error: reason }, { status: 502 });
    }

    console.log("[manual-whatsapp] WhatsApp Send Success");
    markSent(customer._id, shareType, entityId);
    await createAuditLog({
      senderAdminId: auth.userId,
      senderRole: auth.role,
      customer,
      customerId: customer._id,
      shareType,
      entityId,
      status: "sent",
      result,
    });

    return NextResponse.json({
      success: true,
      result,
      audit: {
        senderAdminId: auth.userId,
        senderRole: auth.role,
        customerId: customer._id,
        billId: shareType === "bill" || shareType === "payment" || shareType === "reminder" ? entityId : undefined,
        status: "sent",
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send WhatsApp message";
    console.error("[manual-whatsapp] send failed", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}