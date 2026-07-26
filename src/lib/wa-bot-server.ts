import { sendOpenWaText, sendOpenWaBulk } from "@/lib/openwa-client"
import { notificationTemplates, formatCurrency, formatDate, greetingByTime, footerText } from "@/lib/notifications/template-engine"

type SendResult = {
  ok: boolean
  phone: string
  jid?: string | null
  messageId?: string | null
  error?: string
  skipped?: boolean
}

type SendBulkResult = {
  ok: boolean
  sent: number
  failed: number
  results: SendResult[]
  error?: string
}

let idempotencyCache = new Map<string, number>()
const IDEMPOTENCY_TTL = 86_400_000
const MAX_CACHE_SIZE = 10_000

function checkIdempotency(key: string): boolean {
  const now = Date.now()
  if (idempotencyCache.has(key)) {
    const ts = idempotencyCache.get(key)!
    if (now - ts < IDEMPOTENCY_TTL) return true
    idempotencyCache.delete(key)
  }
  if (idempotencyCache.size >= MAX_CACHE_SIZE) {
    const entries = [...idempotencyCache.entries()]
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    for (const [k] of toDelete) idempotencyCache.delete(k)
  }
  idempotencyCache.set(key, now)
  return false
}

function hashString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function makeIdempotencyKey(phone: string, message: string, eventType?: string): string {
  return `${eventType || 'api_send'}:${phone}:${hashString(message)}`
}

export async function sendViaWaBotServer(input: { phones?: string[]; phone?: string; message: string; eventType?: string }): Promise<SendBulkResult> {
  try {
    const phones = Array.isArray(input.phones) ? input.phones.map(String).filter(Boolean) : (input.phone ? [String(input.phone)] : [])
    const message = String(input.message || '').trim()
    if (!phones.length) return { ok: false, sent: 0, failed: 0, results: [], error: 'phone or phones is required' }
    if (!message) return { ok: false, sent: 0, failed: phones.length, results: [], error: 'message is required' }

    const results: SendResult[] = []
    for (const phone of phones) {
      const idempotencyKey = makeIdempotencyKey(phone, message, input.eventType)
      if (checkIdempotency(idempotencyKey)) {
        results.push({ ok: true, phone, skipped: true })
        continue
      }
      const res = await sendOpenWaText(phone, message)
      if (!res.ok) {
        idempotencyCache.delete(idempotencyKey)
        results.push({ ok: false, phone, error: res.error })
        continue
      }
      results.push({ ok: true, phone, jid: res.jid, messageId: res.messageId })
    }

    const sent = results.filter(r => r.ok).length
    const failed = results.length - sent
    return { ok: true, sent, failed, results }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: msg }
  }
}

function buildMessageFromEvent(eventName: string, payload: Record<string, unknown>): { phone?: string; message: string } | null {
  const customer: any = { name: payload.customerName }
  const phone = String(payload.customerPhone || payload.phone || "").replace(/\D/g, "")
  if (!phone) return null

  const loginUrl = payload.loginUrl ? String(payload.loginUrl) : undefined

  switch (eventName) {
    case "billing.created":
    case "billing.created.unpaid":
    case "billing.created.paid":
    case "billing.created.partial":
    case "billing.created.zero_balance": {
      const message = notificationTemplates.billCreated({
        customer,
        bill: payload as any,
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.payment.paid": {
      const message = notificationTemplates.paymentReceived({
        customer,
        bill: payload as any,
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.payment.partial": {
      const message = notificationTemplates.paymentPartial({
        customer,
        bill: payload as any,
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.updated": {
      const message = notificationTemplates.billUpdated({
        customer,
        bill: payload as any,
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.deleted":
    case "bill-deleted": {
      const message = notificationTemplates.billDeleted({
        customer,
        bill: payload as any,
      })
      return { phone, message }
    }
    case "billing.payment.removed":
    case "billing.payment.updated": {
      const bill = payload as any
      const total = formatCurrency(bill.totalAmount || 0)
      const paid = formatCurrency(bill.paidAmount || 0)
      const remaining = formatCurrency(bill.balanceAmount || 0)
      const message = [
        `Payment ${eventName === "billing.payment.removed" ? "Removed" : "Updated"}`,
        "",
        greetingByText(customer),
        "",
        `Bill ID: ${bill.billNumber || bill.billId || bill.billId || "-"}`,
        `Total: ${total}`,
        `Paid: ${paid}`,
        `Remaining: ${remaining}`,
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "billing.multiPaid":
    case "billing.bulkPaid": {
      const count = payload.count || payload.billCount || 1
      const amount = formatCurrency(payload.totalAmount || payload.amount || 0)
      const message = [
        `Payment Received for Multiple Bills`,
        "",
        greetingByText(customer),
        "",
        `Payment for ${count} bill(s) has been received.`,
        `Total Amount: ${amount}`,
        "",
        "Thank you for your payment.",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "customer.created": {
      const message = notificationTemplates.accountCreated({ customer, loginUrl })
      return { phone, message }
    }
    case "workTask.created":
    case "workTask.updated":
    case "workTask.completed":
    case "workTask.cancelled":
    case "workTask.hold": {
      const request = {
        requestId: String(payload.requestId || payload.workRequestId || ""),
        title: String(payload.title || payload.serviceType || ""),
        serviceType: String(payload.serviceType || ""),
        status: String(payload.status || eventName.split(".")[1] || ""),
        priority: String(payload.priority || ""),
      }
      const message = notificationTemplates.workRequest({ customer, request })
      return { phone, message }
    }
    case "billing.payment.failed":
    case "paymentFailed": {
      const message = notificationTemplates.paymentFailed({
        customer,
        bill: payload as any,
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.dueToday":
    case "paymentDueToday": {
      const bill = payload as any
      const bills = payload.bills ? (payload.bills as any[]) : [bill]
      const message = notificationTemplates.paymentDueToday({
        customer,
        bill,
        bills,
        dueDate: String(payload.dueDate || ""),
        loginUrl,
      })
      return { phone, message }
    }
    case "billing.overdue":
    case "paymentOverdue": {
      const bill = payload as any
      const bills = payload.bills ? (payload.bills as any[]) : [bill]
      const message = notificationTemplates.paymentOverdue({
        customer,
        bill,
        bills,
        dueDate: String(payload.dueDate || ""),
        loginUrl,
      })
      return { phone, message }
    }
    case "customer.request.created": {
      const message = [
        `New Customer Registration Request`,
        "",
        greetingByText(customer),
        "",
        `Name: ${payload.name || payload.customerName || "-"}`,
        `Phone: ${payload.customerPhone || payload.phone || "-"}`,
        `Request Type: ${payload.requestType || "self_registration"}`,
        `Request ID: ${payload.requestId || "-"}`,
        "",
        "Please review and approve this request in the admin panel.",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "toolRent.created":
    case "toolRent.returned":
    case "toolRent.paid": {
      const toolName = String(payload.toolName || "Tool")
      const isReturn = eventName === "toolRent.returned" || eventName === "toolRent.paid"
      const message = [
        isReturn ? "Tool Rental Completed & Paid" : "New Tool Rental",
        "",
        greetingByText(customer),
        "",
        `Tool: ${toolName}`,
        ...(payload.totalAmount ? [`Amount: ${formatCurrency(Number(payload.totalAmount))}`] : []),
        ...(isReturn && payload.paidAmount ? [`Paid: ${formatCurrency(Number(payload.paidAmount))}`] : []),
        ...(!isReturn && payload.rentalDays ? [`Rental Days: ${payload.rentalDays}`] : []),
        ...(payload.returnedDate ? [`Returned: ${formatDate(String(payload.returnedDate))}`] : []),
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "toolRent.overdue": {
      const message = [
        `Tool Rental Overdue`,
        "",
        greetingByText(customer),
        "",
        `Tool: ${payload.toolName || "Tool"}`,
        ...(payload.overdueDays ? [`Overdue by: ${payload.overdueDays} day(s)`] : []),
        ...(payload.penaltyAmount ? [`Penalty: ${formatCurrency(Number(payload.penaltyAmount))}`] : []),
        ...(payload.totalAmount ? [`Amount Due: ${formatCurrency(Number(payload.totalAmount))}`] : []),
        "",
        "Please return the tool at the earliest.",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "workTask.reminder.overdue":
    case "workTask.reminder.due":
    case "workTask.reminder.pending": {
      const isOverdue = eventName === "workTask.reminder.overdue"
      const isDue = eventName === "workTask.reminder.due"
      const label = isOverdue ? "Overdue Task Reminder" : isDue ? "Task Due Reminder" : "Pending Task Follow-up"
      const technicianName = String(payload.technicianName || "Technician")
      const message = [
        label,
        "",
        `Hi ${technicianName},`,
        "",
        isOverdue
          ? `You have an overdue task that requires immediate attention.`
          : isDue
            ? `You have a task due soon. Please plan accordingly.`
            : `You have a pending task that needs follow-up.`,
        "",
        `Task: ${payload.taskTitle || payload.title || "-"}`,
        `Customer: ${payload.customerName || "-"}`,
        ...(payload.customerLocation ? [`Location: ${payload.customerLocation}`] : []),
        ...(payload.priority ? [`Priority: ${payload.priority}`] : []),
        ...(payload.dueAt ? [`Due: ${formatDate(String(payload.dueAt))}`] : []),
        ...(payload.overdueDays ? [`Overdue by: ${payload.overdueDays} day(s)`] : []),
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "bill.reminder.technician": {
      const technicianName = String(payload.technicianName || "Technician")
      const billNum = String(payload.billNumber || payload.billId || "-")
      const message = [
        `Bill Assigned Reminder`,
        "",
        `Hi ${technicianName},`,
        "",
        `A bill has been assigned to you.`,
        "",
        `Bill: ${billNum}`,
        ...(payload.totalAmount ? [`Amount: ${formatCurrency(Number(payload.totalAmount))}`] : []),
        ...(payload.balanceAmount ? [`Balance: ${formatCurrency(Number(payload.balanceAmount))}`] : []),
        ...(payload.customerName ? [`Customer: ${payload.customerName}`] : []),
        ...(payload.serviceType ? [`Service: ${payload.serviceType}`] : []),
        "",
        "Please follow up with the customer regarding this bill.",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "scheduled.goodMorning": {
      const message = [
        `Good Morning!`,
        "",
        greetingByText(customer),
        "",
        "Have a wonderful day ahead!",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "scheduled.festivalGreeting": {
      const festival = String(payload.festivalName || "the festival")
      const message = [
        `Happy ${festival}!`,
        "",
        greetingByText(customer),
        "",
        payload.festivalMessage || `Wishing you and your family a joyous ${festival}!`,
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    case "offer.created":
    case "offer.distributed": {
      const offerTitle = String(payload.offerTitle || payload.title || "Special Offer")
      const message = [
        `🎉 ${offerTitle}`,
        "",
        greetingByText(customer),
        "",
        ...(payload.offerType === "percentage" ? [`Discount: ${payload.discountValue}% off`] : []),
        ...(payload.offerType === "fixed_amount" ? [`Discount: ₹${payload.discountValue} off`] : []),
        ...(payload.description ? [String(payload.description)] : []),
        ...(payload.minimumOrderAmount ? [`Min. Order: ₹${payload.minimumOrderAmount}`] : []),
        ...(payload.endAt ? [`Valid till: ${formatDate(String(payload.endAt))}`] : []),
        "",
        "Reply to this message for more details.",
        "",
        footerText(),
      ].join("\n")
      return { phone, message }
    }
    default:
      return null
  }
}

function greetingByText(customer: any) {
  return greetingByTime(customer?.name)
}

export async function emitWaEventServer(eventName: string, payload: Record<string, unknown>): Promise<{ ok: boolean; queued?: boolean; skipped?: boolean; error?: string }> {
  try {
    const built = buildMessageFromEvent(eventName, payload)
    if (!built) {
      return { ok: false, error: `No template mapping for event: ${eventName}` }
    }

    const result = await sendViaWaBotServer({
      phone: built.phone,
      message: built.message,
      eventType: eventName,
    })

    if (!result.ok || result.failed > 0) {
      return { ok: false, error: result.error || result.results?.[0]?.error || "send failed" }
    }

    return { ok: true, queued: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function emitWaEventClient(eventName: string, payload: Record<string, unknown>): Promise<{ ok: boolean; queued?: boolean; skipped?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/wa/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, payload }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || json?.ok === false || json?.success === false) {
      return { ok: false, error: json?.error || json?.message || `${res.status} ${res.statusText}` };
    }
    return { ok: true, queued: Boolean(json?.queued), skipped: Boolean(json?.skipped) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
