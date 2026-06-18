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

async function persistNotification(input: SendNotificationEventInput, targetUserIds: string[], id: string) {
  const createdAt = new Date().toISOString();
  const title = cleanNotificationText(input.title, "Notification");
  const body = cleanNotificationText(input.body, "You have a new update.");
  const doc: NotificationDoc = {
    _id: `notification.${id}`,
    _type: "notification",
    title,
    body,
    audience: audienceFor(input.type, targetUserIds),
    type: input.type,
    actorUserId: input.actorUserId || "",
    targetUserIds,
    data: {
      ...(input.data || {}),
      route: input.data?.route || input.data?.route_path,
    },
    readBy: [],
    deliveryStatus: "queued",
    statusHistory: [{ status: "queued", at: createdAt }],
    deliveryAttempts: 0,
    createdAt,
    eventId: id,
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

export async function sendNotificationEvent(input: SendNotificationEventInput): Promise<{
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
    const persisted = await persistNotification(safeInput, targetUserIds, eventId);
    if ("conflict" in persisted && persisted.conflict) {
      return {
        ok: true,
        notificationId: persisted.notificationId,
        targetUserIds,
        send: { success: true, sent: 0, failed: 0 },
      };
    }

    const tokens = await getActiveTokenStringsForUsers(targetUserIds);
    console.log("[FCM_TRACE] receiver_token_found", tokens.length > 0);
    console.log("[FCM_TRACE] token_count", tokens.length);
    if (!tokens.length) {
      await updateNotificationDeliveryStatus({
        notificationId: persisted.notificationId,
        status: "failed",
        attempts: 0,
        detail: "No active tokens",
      });
      return {
        ok: true,
        notificationId: persisted.notificationId,
        targetUserIds,
        send: { success: false, sent: 0, failed: 0, errors: ["No active tokens"] },
      };
    }

    const payload = buildNotificationData({
      id: persisted.notificationId,
      type: input.type,
      title: safeTitle,
      body: safeBody,
      data: input.data,
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
    if (send.errors?.length) {
      console.error("[FCM_TRACE] firebase_error", send.errors.slice(0, 5).join(" | "));
    }

    await updateNotificationDeliveryStatus({
      notificationId: persisted.notificationId,
      status: send.sent > 0 ? "sent" : "failed",
      attempts: tokens.length,
      detail: send.errors?.slice(0, 3).join(" | "),
    });

    return { ok: true, notificationId: persisted.notificationId, targetUserIds, send };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notifications] sendNotificationEvent failed", message);
    console.error("[FCM_TRACE] firebase_error", message);
    return {
      ok: false,
      targetUserIds: [],
      send: { success: false, sent: 0, failed: 0, errors: [message] },
      error: message,
    };
  }
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
  return sendNotificationEvent({ ...input, userIds, skipActor: true });
}
