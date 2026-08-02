/**
 * Reliable WhatsApp message queue (Sanity-backed).
 *
 * Every outbound message is persisted as a `whatsAppMessage` document with a
 * full lifecycle:
 *
 *   queued -> sending -> sent | failed (retryable: back to queued with retryAt)
 *
 * Retry policy: ONLY transient failures are retried (network timeouts, bot
 * reconnecting, rate limits) with exponential backoff. Permanent failures
 * (invalid phone, number not registered on WhatsApp, invalid chat id) fail
 * immediately with an explicit failureReason — nothing is ever dropped
 * silently.
 */

import { sanityClient } from "@/lib/sanity";
import { sendOpenWaText } from "@/lib/openwa-client";
import { normalizePhoneToE164, phoneRejectLabel } from "@/lib/whatsapp/phone";
import { waitSendGap } from "@/lib/whatsapp/send-gap";

export type WhatsAppMessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled";

export type WhatsAppMessageEntry = {
  _id: string;
  messageId?: string;
  customerId?: string;
  customerName?: string;
  billId?: string;
  phoneNumber?: string;
  messageType?: string;
  message?: string;
  status: WhatsAppMessageStatus;
  failureReason?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  retryAt?: string;
  scheduledAt?: string;
  queuedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  whatsappMessageId?: string;
  idempotencyKey?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EnqueueMessageInput = {
  customerId?: string;
  customerName?: string;
  billId?: string;
  phoneNumber: string;
  messageType: string;
  message: string;
  scheduledAt?: Date | string;
  idempotencyKey?: string;
  maxRetries?: number;
};

export type EnqueueMessageResult =
  | { ok: true; entry: WhatsAppMessageEntry; duplicate: boolean }
  | { ok: false; error: string; entry?: WhatsAppMessageEntry };

export type ProcessResult = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<{
    messageId: string;
    customerId?: string;
    phoneNumber?: string;
    status: WhatsAppMessageStatus;
    error?: string;
  }>;
};

export type MessageQueueStats = {
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  failed: number;
  cancelled: number;
  retrying: number;
  total: number;
  sentToday: number;
  failedToday: number;
};

const RETRY_BASE_MS = 60_000; // 1 min
const RETRY_MAX_MS = 30 * 60_000; // 30 min cap
const DEFAULT_MAX_RETRIES = 4;

const STATUS_LIST = ["queued", "sending", "sent", "delivered", "failed", "cancelled"];

function nowIso(): string {
  return new Date().toISOString();
}

function nextRetryAt(retryCount: number): string {
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (retryCount - 1));
  return new Date(Date.now() + delay).toISOString();
}

export function newMessageId(): string {
  return `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toEntry(doc: Record<string, any> | null): WhatsAppMessageEntry | null {
  if (!doc) return null;
  return {
    _id: doc._id,
    messageId: doc.messageId,
    customerId: doc.customerId,
    customerName: doc.customerName,
    billId: doc.billId,
    phoneNumber: doc.phoneNumber,
    messageType: doc.messageType,
    message: doc.message,
    status: STATUS_LIST.includes(doc.status) ? doc.status : "queued",
    failureReason: doc.failureReason,
    errorCode: doc.errorCode,
    retryCount: Number(doc.retryCount || 0),
    maxRetries: Number(doc.maxRetries || DEFAULT_MAX_RETRIES),
    retryAt: doc.retryAt,
    scheduledAt: doc.scheduledAt,
    queuedAt: doc.queuedAt,
    sentAt: doc.sentAt,
    deliveredAt: doc.deliveredAt,
    failedAt: doc.failedAt,
    whatsappMessageId: doc.whatsappMessageId,
    idempotencyKey: doc.idempotencyKey,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Enqueue one WhatsApp message. Invalid phone numbers are rejected here and
 * persisted as a `failed` entry with the customer id — they are logged, never
 * silently dropped. Duplicate `idempotencyKey` submissions return the existing
 * entry without re-sending.
 */
export async function enqueueWhatsAppMessage(input: EnqueueMessageInput): Promise<EnqueueMessageResult> {
  try {
    const now = nowIso();
    const scheduledAt = input.scheduledAt instanceof Date ? input.scheduledAt.toISOString() : input.scheduledAt || now;

    const normalized = normalizePhoneToE164(input.phoneNumber);
    if (!normalized.ok) {
      const reason = phoneRejectLabel(normalized.reason);
      const failedEntry = await sanityClient.create<Record<string, any>>({
        _type: "whatsAppMessage",
        messageId: newMessageId(),
        customerId: input.customerId || "",
        customerName: input.customerName || "",
        billId: input.billId || "",
        phoneNumber: String(input.phoneNumber || ""),
        messageType: input.messageType,
        message: input.message,
        status: "failed",
        failureReason: `${reason} (customer: ${input.customerId || "unknown"})`,
        errorCode: `INVALID_PHONE_${normalized.reason.toUpperCase()}`,
        retryCount: 0,
        maxRetries: 0,
        idempotencyKey: input.idempotencyKey || "",
        scheduledAt,
        queuedAt: now,
        failedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: false, error: reason, entry: toEntry(failedEntry as any) ?? undefined };
    }

    if (input.idempotencyKey) {
      const existing = await sanityClient.fetch<{ _id: string } | null>(
        `*[_type == "whatsAppMessage" && idempotencyKey == $key][0]{_id}`,
        { key: input.idempotencyKey },
      );
      if (existing?._id) {
        const doc = await sanityClient.fetch<Record<string, any>>(
          `*[_id == $id][0]`,
          { id: existing._id },
        );
        return { ok: true, entry: toEntry(doc)!, duplicate: true };
      }
    }

    const doc = await sanityClient.create<Record<string, any>>({
      _type: "whatsAppMessage",
      messageId: newMessageId(),
      customerId: input.customerId || "",
      customerName: input.customerName || "",
      billId: input.billId || "",
      phoneNumber: normalized.e164,
      messageType: input.messageType,
      message: input.message,
      status: "queued",
      retryCount: 0,
      maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
      idempotencyKey: input.idempotencyKey || "",
      scheduledAt,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, entry: toEntry(doc as any)!, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WhatsAppQueue] enqueue failed", error);
    return { ok: false, error: `Queue write failed: ${message}` };
  }
}

/** Atomically claim a queued message (sending) — safe against double-processing. */
async function claimMessage(doc: { _id: string; _rev: string }): Promise<boolean> {
  try {
    await sanityClient.mutate([
      {
        patch: {
          id: doc._id,
          set: { status: "sending", updatedAt: nowIso() },
          ifRevisionID: doc._rev,
        },
      },
    ]);
    return true;
  } catch {
    return false; // revision moved — another worker is processing it
  }
}

async function failEntryPermanently(id: string, errorCode: string, failureReason: string, attempt: number) {
  await sanityClient
    .patch(id)
    .set({
      status: "failed",
      errorCode,
      failureReason,
      retryCount: attempt,
      failedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .commit();
}

async function scheduleRetry(id: string, retryCount: number, maxRetries: number, errorCode: string, failureReason: string) {
  const remaining = maxRetries - retryCount;
  await sanityClient
    .patch(id)
    .set({
      status: "queued",
      retryCount,
      errorCode,
      failureReason,
      retryAt: nextRetryAt(retryCount),
      updatedAt: nowIso(),
    })
    .commit();
}

/**
 * Process due queued messages. `onlyIds` limits work to specific messages
 * (used by the dashboard retry button). Every send is paced by the global
 * 10–30s send gap; `timeBudgetMs` stops processing early so serverless
 * invocations never exceed their runtime limit (leftover messages stay
 * queued and are picked up by the next drain). Returns a summary; every
 * message is left in `sent` or `failed` (with an explicit reason) — never
 * dropped.
 */
export async function processDueWhatsAppMessages(input: {
  limit?: number;
  onlyIds?: string[];
  timeBudgetMs?: number;
} = {}): Promise<ProcessResult> {
  const limit = Math.min(Math.max(Math.trunc(input.limit || 10), 1), 100);
  const now = nowIso();
  const results: ProcessResult["results"] = [];
  const deadline = input.timeBudgetMs ? Date.now() + input.timeBudgetMs : 0;

  let due: Array<Record<string, any>>;
  try {
    if (input.onlyIds?.length) {
      due = await sanityClient.fetch(
        `*[_type == "whatsAppMessage" && _id in $ids && status in ["queued", "sending"]] | order(queuedAt asc)[0...$limit]`,
        { ids: input.onlyIds, limit },
      );
    } else {
      const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
      due = await sanityClient.fetch(
        `*[_type == "whatsAppMessage" && (
          (status == "queued" && (!defined(retryAt) || retryAt <= $now)) ||
          (status == "sending" && updatedAt < $staleCutoff)
        )] | order(queuedAt asc)[0...$limit]`,
        { now, staleCutoff, limit },
      );
    }
  } catch (error) {
    console.error("[WhatsAppQueue] fetch due failed", error);
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, results };
  }

  for (const raw of due || []) {
    if (deadline && Date.now() >= deadline) break;
    const claimed = await claimMessage({ _id: raw._id, _rev: raw._rev });
    if (!claimed) {
      results.push({
        messageId: raw.messageId || raw._id,
        customerId: raw.customerId,
        phoneNumber: raw.phoneNumber,
        status: "queued",
        error: "claimed_by_another_worker",
      });
      continue;
    }

    const entry = toEntry(raw)!;
    const attempt = Number(entry.retryCount || 0);
    const maxRetries = Number(entry.maxRetries || DEFAULT_MAX_RETRIES);

    try {
      await waitSendGap();
      const sendResult = await sendOpenWaText(entry.phoneNumber || "", entry.message || "");

      if (sendResult.ok) {
        await sanityClient
          .patch(entry._id)
          .set({
            status: "sent",
            sentAt: nowIso(),
            whatsappMessageId: sendResult.messageId || "",
            errorCode: "",
            failureReason: "",
            updatedAt: nowIso(),
          })
          .commit();
        results.push({ messageId: entry.messageId || entry._id, customerId: entry.customerId, phoneNumber: entry.phoneNumber, status: "sent" });
        continue;
      }

      const retryable = sendResult.retryable !== false;
      const errorCode = sendResult.errorCode || "SEND_FAILED";
      const failureReason = sendResult.error || "WhatsApp send failed";

      if (retryable && attempt < maxRetries) {
        const nextCount = attempt + 1;
        await scheduleRetry(entry._id, nextCount, maxRetries, errorCode, failureReason);
        results.push({
          messageId: entry.messageId || entry._id,
          customerId: entry.customerId,
          phoneNumber: entry.phoneNumber,
          status: "queued",
          error: `retry ${nextCount}/${maxRetries}: ${failureReason}`,
        });
        continue;
      }

      await failEntryPermanently(entry._id, errorCode, failureReason, attempt);
      results.push({
        messageId: entry.messageId || entry._id,
        customerId: entry.customerId,
        phoneNumber: entry.phoneNumber,
        status: "failed",
        error: failureReason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[WhatsAppQueue] process message failed", entry._id, error);
      await failEntryPermanently(entry._id, "QUEUE_PROCESS_ERROR", message, attempt);
      results.push({
        messageId: entry.messageId || entry._id,
        customerId: entry.customerId,
        phoneNumber: entry.phoneNumber,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "queued").length,
    results,
  };
}

/** Manual retry from the admin dashboard: reset + reprocess one message. */
export async function retryWhatsAppMessage(messageId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const doc = await sanityClient.fetch<{ _id: string } | null>(
      `*[_type == "whatsAppMessage" && (_id == $id || messageId == $id)][0]{_id}`,
      { id: messageId },
    );
    if (!doc?._id) return { ok: false, error: "Message not found" };

    await sanityClient
      .patch(doc._id)
      .set({
        status: "queued",
        retryCount: 0,
        retryAt: undefined,
        failedAt: undefined,
        errorCode: "",
        failureReason: "",
        updatedAt: nowIso(),
      })
      .commit();

    await processDueWhatsAppMessages({ onlyIds: [doc._id] });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getWhatsAppMessageStats(): Promise<MessageQueueStats> {
  const today = nowIso().slice(0, 10);
  try {
    const rows = await sanityClient.fetch<Array<{ status: string; retryCount: number; sentAt?: string; failedAt?: string }>>(
      `*[_type == "whatsAppMessage"]{status, retryCount, sentAt, failedAt}`,
    );
    const stats: MessageQueueStats = {
      queued: 0, sending: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0, retrying: 0, total: rows.length, sentToday: 0, failedToday: 0,
    };
    for (const row of rows) {
      const status = STATUS_LIST.includes(row.status) ? row.status : "queued";
      if (status === "queued" && Number(row.retryCount) > 0) stats.retrying += 1;
      stats[status] += 1;
      if ((row.sentAt || "").slice(0, 10) === today) stats.sentToday += 1;
      if ((row.failedAt || "").slice(0, 10) === today) stats.failedToday += 1;
    }
    return stats;
  } catch (error) {
    console.error("[WhatsAppQueue] stats failed", error);
    return { queued: 0, sending: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0, retrying: 0, total: 0, sentToday: 0, failedToday: 0 };
  }
}

export async function listWhatsAppMessages(input: {
  limit?: number;
  offset?: number;
  status?: WhatsAppMessageStatus;
} = {}): Promise<WhatsAppMessageEntry[]> {
  const limit = Math.min(Math.max(Math.trunc(input.limit || 50), 1), 200);
  const offset = Math.max(Math.trunc(input.offset || 0), 0);
  try {
    let query = `*[_type == "whatsAppMessage"]`;
    const params: Record<string, unknown> = { limit, offset };
    if (input.status) {
      query += ` && status == $status`;
      params.status = input.status;
    }
    query += ` | order(queuedAt desc)[$offset...$limit]{_id, messageId, customerId, customerName, billId, phoneNumber, messageType, message, status, failureReason, errorCode, retryCount, maxRetries, retryAt, scheduledAt, queuedAt, sentAt, deliveredAt, failedAt, whatsappMessageId, idempotencyKey, createdAt, updatedAt}`;
    const docs = await sanityClient.fetch<Array<Record<string, any>>>(query, params);
    return (docs || []).map((doc) => toEntry(doc)!);
  } catch (error) {
    console.error("[WhatsAppQueue] list failed", error);
    return [];
  }
}

/** Fetch one queued message by document id. */
export async function getWhatsAppMessage(id: string): Promise<WhatsAppMessageEntry | null> {
  try {
    const doc = await sanityClient.fetch<Record<string, any>>(
      `*[_id == $id]{_id, messageId, customerId, customerName, billId, phoneNumber, messageType, message, status, failureReason, errorCode, retryCount, maxRetries, retryAt, scheduledAt, queuedAt, sentAt, deliveredAt, failedAt, whatsappMessageId, idempotencyKey, createdAt, updatedAt}[0]`,
      { id },
    );
    return toEntry(doc);
  } catch (error) {
    console.error("[WhatsAppQueue] get failed", error);
    return null;
  }
}
