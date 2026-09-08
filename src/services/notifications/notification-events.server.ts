import "server-only";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { sanityClient } from "@/lib/sanity";
import { createDocument, deleteDocument } from "@/lib/sanity/write-router";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import { buildNotificationData, hasNotificationText } from "@/lib/fcm/payload";
import { sendFcmToTokens } from "./fcm-sender.server";
import { sanitizeUserText } from "@/constants/defaults";
import type {
  NotificationEventType,
  NotificationLatencyMark,
  NotificationSendResult,
  SendNotificationEventInput,
} from "@/types/notifications";

type NotificationDoc = {
  _id: string;
  _type: "notification";
  title: string;
  body: string;
  audience: "all" | "admins" | "users" | "custom";
  type: string;
  actorUserId: string;
  targetUserIds: string[];
  data?: Record<string, unknown>;
  readBy: string[];
  deliveryStatus: "queued" | "sent" | "failed" | "delivered" | "opened";
  statusHistory: Array<{ status: string; at: string; detail?: string }>;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  deliveryAttempts: number;
  deliveryError?: string;
  createdAt: string;
  eventId: string;
  dedupeKey?: string;
};

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function eventIdFor(input: SendNotificationEventInput) {
  if (input.eventId) return input.eventId;
  const ids = unique([input.userId, ...(input.userIds || [])]).join(",");
  const route = input.data?.route || input.data?.route_path || "";
  const bucket = Math.floor(Date.now() / 60000);
  return createHash("sha256")
    .update(`${input.type}|${input.actorUserId || ""}|${ids}|${route}|${bucket}`)
    .digest("hex")
    .slice(0, 32);
}

function safeKeyPart(value: unknown, fallback = "none") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[:\s]+/g, "-")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 96);
  return cleaned || fallback;
}

function dateBucketFor(input: SendNotificationEventInput) {
  const data = input.data || {};
  const explicit =
    data.date ||
    data.greetingDate ||
    data.festivalDate ||
    data.localDate ||
    data.day ||
    data.createdAt ||
    data.updatedAt;
  const explicitText = String(explicit || "").trim();
  const dateMatch = explicitText.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateMatch) return dateMatch;
  if (input.type === "daily_good_morning" || input.type === "scheduled.dailyGreeting") {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  return String(Math.floor(Date.now() / 60_000));
}

function entityIdFor(input: SendNotificationEventInput, eventId: string) {
  const data = input.data || {};
  return (
    data.entityId ||
    data.sourceId ||
    data.messageId ||
    data.billMessageId ||
    data.billId ||
    data.workId ||
    data.taskId ||
    data.toolRentId ||
    data.rentalId ||
    data.requestId ||
    data.offerId ||
    data.roomId ||
    data.campaignId ||
    data.notificationId ||
    data.id ||
    eventId
  );
}

function dedupeKeyFor(input: SendNotificationEventInput, targetUserId: string, eventId: string) {
  const explicit = String(input.dedupeKey || input.data?.dedupeKey || "").trim();
  if (explicit) return explicit;
  return [
    safeKeyPart(input.type, "system.general"),
    safeKeyPart(targetUserId, "user"),
    safeKeyPart(entityIdFor(input, eventId), "source"),
    safeKeyPart(dateBucketFor(input), "bucket"),
  ].join(":");
}

function notificationDocumentId(id: string, dedupeKey?: string) {
  if (!dedupeKey) return `notification.${id}`;
  return `notification.${createHash("sha256").update(dedupeKey).digest("hex").slice(0, 32)}`;
}

function audienceFor(type: NotificationEventType, targetUserIds: string[]) {
  if (type === "system.general" && !targetUserIds.length) return "all";
  return targetUserIds.length === 1 ? "users" : "custom";
}

function cleanNotificationText(value: string, fallback: string) {
  const cleaned = sanitizeUserText(String(value || ""))
    .replace(/[<>`]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
}

// ---------------------------------------------------------------------------
// Idempotency: one business event => at most one FCM push per recipient.
// The lock is in-memory (per lambda instance, 60s window) and mirrors the
// previous Sanity document-conflict dedupe, but with ZERO database round trip
// in the fast path. Derived dedupeKeys inherit the exact legacy bucketing, so
// this is strictly weaker/equal to the old behavior (never suppresses more).
// ---------------------------------------------------------------------------
const IDEMPOTENCY_TTL_MS = 60_000;
const dispatchedLocks = new Map<string, number>();

function lockKey(eventId: string, userId: string) {
  return `${eventId}:${userId}`;
}

function isDuplicateDispatch(eventId: string, userId: string) {
  const key = lockKey(eventId, userId);
  const now = Date.now();
  const seenAt = dispatchedLocks.get(key);
  if (seenAt !== undefined && now - seenAt < IDEMPOTENCY_TTL_MS) return true;
  dispatchedLocks.set(key, now);
  if (dispatchedLocks.size > 10_000) {
    for (const [k, at] of dispatchedLocks) {
      if (now - at > IDEMPOTENCY_TTL_MS) dispatchedLocks.delete(k);
    }
  }
  return false;
}

function isDuplicateDedupe(dedupeKey: string) {
  if (!dedupeKey) return false;
  return isDuplicateDispatch(`d:${dedupeKey}`, "user");
}

export function clearNotificationIdempotencyLocks() {
  dispatchedLocks.clear();
}

function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  return Promise.all(workers).then(() => results);
}

// Single best-effort write used ONLY to power the in-app notification inbox.
// It never gates or delays FCM: the push is sent first, then this persists the
// final status in one write (the old flow issued a create + 1-2 patches per
// notification, adding Sanity round trips before any FCM call).
async function persistNotification(
  input: SendNotificationEventInput,
  targetUserIds: string[],
  id: string,
  dedupeKey: string | undefined,
  status: "sent" | "failed",
  detail?: string,
) {
  const createdAt = new Date().toISOString();
  const title = cleanNotificationText(input.title, "Notification");
  const body = cleanNotificationText(input.body, "You have a new update.");
  const doc: NotificationDoc = {
    _id: notificationDocumentId(id, dedupeKey),
    _type: "notification",
    title,
    body,
    audience: audienceFor(input.type, targetUserIds),
    type: input.type,
    actorUserId: input.actorUserId || "",
    targetUserIds,
    data: {
      ...(input.data || {}),
      ...(dedupeKey ? { dedupeKey } : {}),
      route: input.data?.route || input.data?.route_path,
    },
    readBy: [],
    deliveryStatus: status,
    statusHistory: [{ status, at: createdAt, ...(detail ? { detail } : {}) }],
    deliveryAttempts: 1,
    ...(status === "sent" ? { sentAt: createdAt } : {}),
    ...(detail ? { deliveryError: detail.slice(0, 1000) } : {}),
    createdAt,
    eventId: id,
    ...(dedupeKey ? { dedupeKey } : {}),
  };

  try {
    const { _id: intendedId, ...docBody } = doc;
    const result = await createDocument(docBody as unknown as Record<string, unknown>, "notifications", {
      documentId: intendedId,
    });
    if (!result.success) {
      console.warn("[Notifications] inbox persist skipped", {
        eventId: id,
        userId: targetUserIds[0],
        reason: result.errorCategory || result.error || "unknown",
      });
      return { created: false, notificationId: intendedId, conflict: true };
    }
    return { created: true, notificationId: intendedId };
  } catch (error) {
    const statusCode = (error as { status?: number })?.status || (error as { statusCode?: number })?.statusCode;
    if (statusCode === 409) return { created: false, notificationId: doc._id, conflict: true };
    throw error;
  }
}

type PerUserDispatchResult = {
  targetUserId: string;
  skipped: boolean;
  noTokens: boolean;
  notificationId?: string;
  send?: NotificationSendResult;
  mark?: NotificationLatencyMark;
};

async function dispatchToUser(
  safeInput: SendNotificationEventInput,
  eventId: string,
  targetUserId: string,
): Promise<PerUserDispatchResult> {
  const t0 = performance.now();
  const dedupeKey = dedupeKeyFor(safeInput, targetUserId, eventId);
  const notificationId = notificationDocumentId(eventId, dedupeKey);

  if (isDuplicateDispatch(eventId, targetUserId) || isDuplicateDedupe(dedupeKey)) {
    return { targetUserId, skipped: true, noTokens: false };
  }

  const targetInput = {
    ...safeInput,
    userId: targetUserId,
    userIds: [targetUserId],
    data: { ...(safeInput.data || {}), dedupeKey },
    dedupeKey,
  };

  const tokens = await getActiveTokenStringsForUsers([targetUserId]);
  const t1 = performance.now();
  if (!tokens.length) {
    const mark: NotificationLatencyMark = {
      eventId,
      type: safeInput.type,
      userId: targetUserId,
      tokenCount: 0,
      t0: Math.round(t0),
      t1: Math.round(t1),
      t2: Math.round(t1),
      totalMs: Math.round(t1 - t0),
      tokenResolveMs: Math.round(t1 - t0),
      fcmMs: 0,
      sent: 0,
      failed: 0,
      skipped: false,
      noTokens: true,
    };
    safeInput.latencyTrace?.(mark);
    return { targetUserId, skipped: false, noTokens: true, mark };
  }

  const safeTitle = safeInput.title;
  const safeBody = safeInput.body;
  const payload = buildNotificationData({
    id: notificationId,
    type: safeInput.type,
    title: safeTitle,
    body: safeBody,
    data: targetInput.data,
  });

  const send = await sendFcmToTokens({
    tokens,
    title: safeTitle,
    body: safeBody,
    data: payload,
    imageUrl: typeof safeInput.data?.imageUrl === "string" ? safeInput.data.imageUrl : undefined,
  });
  const t2 = performance.now();

  const mark: NotificationLatencyMark = {
    eventId,
    type: safeInput.type,
    userId: targetUserId,
    tokenCount: tokens.length,
    t0: Math.round(t0),
    t1: Math.round(t1),
    t2: Math.round(t2),
    totalMs: Math.round(t2 - t0),
    tokenResolveMs: Math.round(t1 - t0),
    fcmMs: Math.round(t2 - t1),
    sent: send.sent,
    failed: send.failed,
    skipped: false,
    noTokens: false,
  };
  safeInput.latencyTrace?.(mark);

  const detail = send.errors?.slice(0, 3).join(" | ");
  try {
    await persistNotification(
      safeInput,
      [targetUserId],
      eventId,
      dedupeKey,
      send.sent > 0 ? "sent" : "failed",
      detail,
    );
  } catch (persistError) {
    console.error("[Notifications] inbox persist failed (push unaffected)", {
      eventId,
      userId: targetUserId,
      error: persistError instanceof Error ? persistError.message : String(persistError),
    });
  }

  return { targetUserId, skipped: false, noTokens: false, notificationId, send, mark };
}

export async function createAndDispatchNotification(input: SendNotificationEventInput): Promise<{
  ok: boolean;
  notificationId?: string;
  targetUserIds: string[];
  send: NotificationSendResult;
  error?: string;
}> {
  const t0 = performance.now();
  try {
    const safeTitle = cleanNotificationText(input.title, "Notification");
    const safeBody = cleanNotificationText(input.body, "You have a new update.");
    if (!hasNotificationText(safeTitle, safeBody)) {
      return {
        ok: false,
        targetUserIds: [],
        send: { success: false, sent: 0, failed: 0, errors: ["Missing title/body"] },
        error: "Missing title/body",
      };
    }

    const requestedTargetUserIds = unique([input.userId, ...(input.userIds || [])]);
    const targetUserIds = requestedTargetUserIds.filter((id) => {
      if (!input.skipActor) return true;
      return id !== input.actorUserId;
    });
    if (requestedTargetUserIds.length && !targetUserIds.length) {
      return {
        ok: true,
        targetUserIds: [],
        send: { success: true, sent: 0, failed: 0 },
      };
    }

    const eventId = eventIdFor(input);
    const safeInput: SendNotificationEventInput = { ...input, title: safeTitle, body: safeBody };

    const results = await mapLimit(targetUserIds, 10, (targetUserId) =>
      dispatchToUser(safeInput, eventId, targetUserId),
    );

    const aggregate: NotificationSendResult = { success: true, sent: 0, failed: 0, errors: [], invalidTokens: [] };
    let firstNotificationId: string | undefined;
    let skipped = 0;
    let noTokens = 0;
    for (const result of results) {
      if (result.noTokens) {
        noTokens += 1;
        aggregate.errors?.push(`No active tokens for ${result.targetUserId}`);
        continue;
      }
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      firstNotificationId ||= result.notificationId;
      if (result.send) {
        aggregate.sent += result.send.sent;
        aggregate.failed += result.send.failed;
        if (result.send.errors?.length) aggregate.errors?.push(...result.send.errors);
        if (result.send.invalidTokens?.length) aggregate.invalidTokens?.push(...result.send.invalidTokens);
      }
    }

    aggregate.success = aggregate.failed === 0 && (!aggregate.errors || aggregate.errors.length === 0);
    if (!aggregate.errors?.length) delete aggregate.errors;
    if (!aggregate.invalidTokens?.length) delete aggregate.invalidTokens;

    const totalMs = Math.round(performance.now() - t0);
    console.log(
      `[NOTIFY_PERF] event=${eventId} type=${input.type} targets=${targetUserIds.length} sent=${aggregate.sent} failed=${aggregate.failed} skipped=${skipped} noTokens=${noTokens} totalMs=${totalMs}`,
    );

    return { ok: true, notificationId: firstNotificationId, targetUserIds, send: aggregate };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notifications] createAndDispatchNotification failed", message);
    return {
      ok: false,
      targetUserIds: [],
      send: { success: false, sent: 0, failed: 0, errors: [message] },
      error: message,
    };
  }
}

export async function sendNotificationEvent(input: SendNotificationEventInput) {
  return createAndDispatchNotification(input);
}

export async function getActiveAdminUserIds() {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role in ["admin","super_admin","technician"] && isActive != false]._id`,
  );
  return unique(ids || []);
}

export async function filterUserIdsByRole(userIds: string[], roles: string[]) {
  const ids = unique(userIds);
  if (!ids.length || !roles.length) return [];
  const result = await sanityClient.fetch<string[]>(
    `*[_type=="user" && _id in $ids && role in $roles && isActive != false]._id`,
    { ids, roles },
  );
  return unique(result || []);
}

export async function sendNotificationToAdmins(input: Omit<SendNotificationEventInput, "userIds" | "userId">) {
  const userIds = await getActiveAdminUserIds();
  return createAndDispatchNotification({ ...input, userIds, skipActor: true });
}

/**
 * Delete persisted in-app/FCM notification documents tied to a business entity.
 * Registration requests persist notifications (they live in the comms DB via the
 * "notifications" purpose, with primary as a legacy fallback). When a request is
 * deleted, any notification whose eventId/data references that request should be
 * removed instantly too.
 */
export async function deleteNotificationsForEntity(entityId: string): Promise<{ deleted: number; total: number }> {
  if (!entityId) return { deleted: 0, total: 0 };

  const eventIdPrefix = `customer.request.created.${entityId}`;
  const sourceQuery = `*[_type == "notification" && (
    eventId == $eventId ||
    data.requestId == $entityId ||
    data.entityId == $entityId
  )][0...100]._id`;

  const commsDb = (() => {
    try {
      return getSanityClient("comms");
    } catch {
      return null;
    }
  })();

  const [primaryIds, commsIds] = await Promise.all([
    sanityClient.fetch<string[]>(sourceQuery, {
      eventId: eventIdPrefix,
      entityId,
    }).catch(() => [] as string[]),
    commsDb
      ? commsDb.fetch<string[]>(sourceQuery, { eventId: eventIdPrefix, entityId }).catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ]);

  const ids = Array.from(new Set([...primaryIds, ...commsIds])).filter(Boolean).slice(0, 100);
  if (!ids.length) return { deleted: 0, total: 0 };

  let deleted = 0;
  for (const id of ids) {
    const result = await deleteDocument(String(id), "notifications").catch(() => null);
    if (result && result.success) {
      deleted++;
      continue;
    }
    if (commsDb) {
      await commsDb.delete(String(id)).catch(() => {});
      deleted++;
    } else {
      await sanityClient.delete(String(id)).catch(() => {});
      deleted++;
    }
  }

  return { deleted, total: ids.length };
}