import "server-only";
import { createHash } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import { buildNotificationData, hasNotificationText } from "@/lib/fcm/payload";
import { sendFcmToTokens } from "./fcm-sender.server";
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
  createdAt: string;
  eventId: string;
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

function audienceFor(type: NotificationEventType, targetUserIds: string[]) {
  if (type === "system.general" && !targetUserIds.length) return "all";
  return targetUserIds.length === 1 ? "users" : "custom";
}

async function persistNotification(input: SendNotificationEventInput, targetUserIds: string[], id: string) {
  const createdAt = new Date().toISOString();
  const doc: NotificationDoc = {
    _id: `notification.${id}`,
    _type: "notification",
    title: input.title.trim(),
    body: input.body.trim(),
    audience: audienceFor(input.type, targetUserIds),
    type: input.type,
    actorUserId: input.actorUserId || "",
    targetUserIds,
    data: {
      ...(input.data || {}),
      route: input.data?.route || input.data?.route_path,
    },
    readBy: [],
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

export async function sendNotificationEvent(input: SendNotificationEventInput): Promise<{
  ok: boolean;
  notificationId?: string;
  targetUserIds: string[];
  send: NotificationSendResult;
  error?: string;
}> {
  try {
    if (!hasNotificationText(input.title, input.body)) {
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
    const persisted = await persistNotification(input, targetUserIds, eventId);
    if ("conflict" in persisted && persisted.conflict) {
      return {
        ok: true,
        notificationId: persisted.notificationId,
        targetUserIds,
        send: { success: true, sent: 0, failed: 0 },
      };
    }

    const tokens = await getActiveTokenStringsForUsers(targetUserIds);
    if (!tokens.length) {
      return {
        ok: true,
        notificationId: persisted.notificationId,
        targetUserIds,
        send: { success: false, sent: 0, failed: 0, errors: ["No active tokens"] },
      };
    }

    const send = await sendFcmToTokens({
      tokens,
      title: input.title.trim(),
      body: input.body.trim(),
      data: buildNotificationData({
        id: persisted.notificationId,
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
        data: input.data,
      }),
    });

    return { ok: true, notificationId: persisted.notificationId, targetUserIds, send };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notifications] sendNotificationEvent failed", message);
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
