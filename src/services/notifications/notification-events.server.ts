import "server-only";
import { createHash } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import { buildNotificationData, hasNotificationText } from "@/lib/fcm/payload";
import { sendFcmToTokens } from "./fcm-sender.server";
import { sanitizeUserText } from "@/constants/defaults";
import type {
  NotificationEventType,
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

function tracePayload(payload: Record<string, unknown>) {
  try {
    console.log("[FCM_TRACE] payload", JSON.stringify(payload));
  } catch {
    console.log("[FCM_TRACE] payload", payload);
  }
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

async function persistNotification(input: SendNotificationEventInput, targetUserIds: string[], id: string, dedupeKey?: string) {
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
    deliveryStatus: "queued",
    statusHistory: [{ status: "queued", at: createdAt }],
    deliveryAttempts: 0,
    createdAt,
    eventId: id,
    ...(dedupeKey ? { dedupeKey } : {}),
  };

  try {
    await sanityClient.create(doc);
    return { created: true, notificationId: doc._id };
  } catch (error) {
    const status = (error as { status?: number; statusCode?: number })?.status || (error as { statusCode?: number })?.statusCode;
    if (status === 409) return { created: false, notificationId: doc._id, conflict: true };
    throw error;
  }
}

async function updateNotificationDeliveryStatus(args: {
  notificationId?: string;
  status: "sent" | "failed";
  attempts: number;
  detail?: string;
}) {
  if (!args.notificationId) return;
  const now = new Date().toISOString();
  await sanityClient
    .patch(args.notificationId)
    .set({
      deliveryStatus: args.status,
      deliveryAttempts: args.attempts,
      updatedAt: now,
      ...(args.status === "sent" ? { sentAt: now } : {}),
      ...(args.detail ? { deliveryError: args.detail.slice(0, 1000) } : {}),
    })
    .setIfMissing({ statusHistory: [] })
    .append("statusHistory", [
      {
        _key: `${args.status}.${Date.now()}`,
        status: args.status,
        at: now,
        ...(args.detail ? { detail: args.detail.slice(0, 500) } : {}),
      },
    ])
    .commit({ autoGenerateArrayKeys: true })
    .catch((error) => {
      console.error("[Notifications] Failed to update delivery status", error);
    });
}

export async function createAndDispatchNotification(input: SendNotificationEventInput): Promise<{
  ok: boolean;
  notificationId?: string;
  targetUserIds: string[];
  send: NotificationSendResult;
  error?: string;
}> {
  try {
    const safeTitle = cleanNotificationText(input.title, "Notification");
    const safeBody = cleanNotificationText(input.body, "You have a new update.");
    console.log("[FCM_TRACE] event_type", input.type);
    console.log("[FCM_TRACE] sender_id", input.actorUserId || "");
    if (!hasNotificationText(safeTitle, safeBody)) {
      return {
        ok: false,
        targetUserIds: [],
        send: { success: false, sent: 0, failed: 0, errors: ["Missing title/body"] },
        error: "Missing title/body",
      };
    }

    const requestedTargetUserIds = unique([input.userId, ...(input.userIds || [])]);
    console.log("[FCM_TRACE] receiver_id", requestedTargetUserIds.join(","));
    const targetUserIds = requestedTargetUserIds.filter((id) => {
      if (!input.skipActor) return true;
      return id !== input.actorUserId;
    });
    if (targetUserIds.length !== requestedTargetUserIds.length) {
      console.log("[FCM_TRACE] receiver_id_after_skip_actor", targetUserIds.join(","));
    }
    if (requestedTargetUserIds.length && !targetUserIds.length) {
      return {
        ok: true,
        targetUserIds: [],
        send: { success: true, sent: 0, failed: 0 },
      };
    }
    const eventId = eventIdFor(input);
    const safeInput = { ...input, title: safeTitle, body: safeBody };
    const aggregate: NotificationSendResult = { success: true, sent: 0, failed: 0, errors: [], invalidTokens: [] };
    let firstNotificationId: string | undefined;

    for (const targetUserId of targetUserIds) {
      const dedupeKey = dedupeKeyFor(safeInput, targetUserId, eventId);
      console.log("[notifications] dedupe key generated", { userId: targetUserId, dedupeKey });
      const targetInput = {
        ...safeInput,
        userId: targetUserId,
        userIds: [targetUserId],
        data: { ...(safeInput.data || {}), dedupeKey },
        dedupeKey,
      };
      const persisted = await persistNotification(targetInput, [targetUserId], eventId, dedupeKey);
      firstNotificationId ||= persisted.notificationId;
      if ("conflict" in persisted && persisted.conflict) {
        console.log("[notifications] skipped duplicate", { userId: targetUserId, dedupeKey });
        continue;
      }

      const tokens = await getActiveTokenStringsForUsers([targetUserId]);
      console.log("[FCM_TRACE] receiver_token_found", tokens.length > 0);
      console.log("[notifications] token count per user", { userId: targetUserId, tokenCount: tokens.length });
      if (!tokens.length) {
        await updateNotificationDeliveryStatus({
          notificationId: persisted.notificationId,
          status: "failed",
          attempts: 0,
          detail: "No active tokens",
        });
        aggregate.errors?.push(`No active tokens for ${targetUserId}`);
        continue;
      }

      const payload = buildNotificationData({
        id: persisted.notificationId,
        type: input.type,
        title: safeTitle,
        body: safeBody,
        data: targetInput.data,
      });
      tracePayload(payload);
      const send = await sendFcmToTokens({
        tokens,
        title: safeTitle,
        body: safeBody,
        data: payload,
        imageUrl: typeof input.data?.imageUrl === "string" ? input.data.imageUrl : undefined,
      });
      console.log("[FCM_TRACE] firebase_response", JSON.stringify(send));
      if (send.sent > 0) console.log("[notifications] FCM send success", { userId: targetUserId, dedupeKey, sent: send.sent });
      if (send.errors?.length) {
        console.error("[notifications] FCM send failure", { userId: targetUserId, dedupeKey, errors: send.errors.slice(0, 5) });
        aggregate.errors?.push(...send.errors);
      }
      if (send.invalidTokens?.length) aggregate.invalidTokens?.push(...send.invalidTokens);
      aggregate.sent += send.sent;
      aggregate.failed += send.failed;

      await updateNotificationDeliveryStatus({
        notificationId: persisted.notificationId,
        status: send.sent > 0 ? "sent" : "failed",
        attempts: tokens.length,
        detail: send.errors?.slice(0, 3).join(" | "),
      });
    }

    aggregate.success = aggregate.failed === 0 && (!aggregate.errors || aggregate.errors.length === 0);
    if (!aggregate.errors?.length) delete aggregate.errors;
    if (!aggregate.invalidTokens?.length) delete aggregate.invalidTokens;
    return { ok: true, notificationId: firstNotificationId, targetUserIds, send: aggregate };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notifications] createAndDispatchNotification failed", message);
    console.error("[FCM_TRACE] firebase_error", message);
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
