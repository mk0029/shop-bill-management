import "server-only";
import { sanityClient } from "./sanity";
import { sendFcmToTokens } from "@/services/notifications/fcm-sender.server";
import {
  getActiveAdminUserIds,
  sendNotificationEvent,
} from "@/services/notifications/notification-events.server";
import { getActiveTokenStringsForUsers } from "@/lib/fcm/tokens.server";
import type { NotificationData, NotificationEventType } from "@/types/notifications";

export type SendPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  tokens?: string[];
  userIds?: string[];
  phoneNumbers?: string[];
  excludeTokens?: string[];
};

export type NotificationEvent = {
  eventId?: string;
  type:
    | "customer_created"
    | "bill_created"
    | "bill_status_updated"
    | "cashbook_entry"
    | "inventory_added"
    | "shop_status"
    | "admin_broadcast"
    | "user_direct";
  actorUserId: string;
  data: {
    customerId?: string;
    billId?: string;
    inventoryId?: string;
    status?: string;
    route?: string;
    message?: string;
    extra?: Record<string, unknown>;
  };
};

type SendResult = {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
};

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function mapLegacyType(type: NotificationEvent["type"]): NotificationEventType {
  if (type === "bill_created") return "billing.created";
  if (type === "bill_status_updated") return "billing.updated";
  if (type === "user_direct") return "system.general";
  if (type === "shop_status") return "system.general";
  return "system.general";
}

function defaultText(event: NotificationEvent) {
  const title = String(event.data.extra?.title || "").trim();
  const body = String(event.data.extra?.body || event.data.message || "").trim();
  if (title && body) return { title, body };
  if (event.type === "bill_created") return { title: "Bill created", body: "A new bill has been created." };
  if (event.type === "bill_status_updated") return { title: "Bill updated", body: `Bill status updated: ${event.data.status || ""}` };
  if (event.type === "cashbook_entry") return { title: "Cashbook entry", body: "A cashbook entry was added." };
  if (event.type === "inventory_added") return { title: "Inventory updated", body: "A new inventory item was added." };
  return { title: title || "Notification", body: body || "You have a new notification." };
}

async function getCustomerUserIds() {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="customer" && isActive != false]._id`,
  );
  return unique(ids || []);
}

async function resolveLegacyTargets(event: NotificationEvent) {
  if (event.type === "admin_broadcast") {
    const target = event.data.extra?.target;
    if (target === "specific_user") return unique([String(event.data.extra?.targetUserId || "")]);
    if (target === "all_users") {
      const [admins, customers] = await Promise.all([getActiveAdminUserIds(), getCustomerUserIds()]);
      return unique([...admins, ...customers]);
    }
    return getActiveAdminUserIds();
  }
  if (event.type === "user_direct") {
    return unique([String(event.data.extra?.targetUserId || event.data.customerId || "")]);
  }
  if (event.type === "bill_created" || event.type === "bill_status_updated") {
    return getActiveAdminUserIds();
  }
  if (event.type === "shop_status") {
    const [admins, customers] = await Promise.all([getActiveAdminUserIds(), getCustomerUserIds()]);
    return unique([...admins, ...customers]);
  }
  return getActiveAdminUserIds();
}

function dataFor(event: NotificationEvent): NotificationData {
  return {
    route: event.data.route,
    route_path: event.data.route,
    billId: event.data.billId,
    customerId: event.data.customerId,
    inventoryId: event.data.inventoryId,
    status: event.data.status,
    legacyType: event.type,
  };
}

export const notificationService = {
  async emit(event: NotificationEvent) {
    try {
      const targets = await resolveLegacyTargets(event);
      const text = defaultText(event);
      const result = await sendNotificationEvent({
        eventId: event.eventId,
        type: mapLegacyType(event.type),
        actorUserId: event.actorUserId,
        userIds: targets,
        title: text.title,
        body: text.body,
        data: dataFor(event),
        skipActor: true,
      });
      return {
        ok: result.ok,
        idempotent: result.send.sent === 0 && result.send.failed === 0,
        notificationId: result.notificationId,
        persisted: Boolean(result.notificationId),
        targets: { userIds: result.targetUserIds, tokenCount: result.send.sent + result.send.failed },
        send: result.send,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, idempotent: false, error: message };
    }
  },
};

export async function sendNotification(payload: SendPayload): Promise<SendResult> {
  const tokens = payload.tokens?.length
    ? payload.tokens
    : payload.userIds?.length
      ? await getActiveTokenStringsForUsers(payload.userIds)
      : [];
  const exclude = new Set((payload.excludeTokens || []).filter(Boolean));
  const filtered = tokens.filter((token) => !exclude.has(token));
  const result = await sendFcmToTokens({
    tokens: filtered,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });
  return {
    success: result.success,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors,
  };
}

export async function sendToAdmins(
  title: string,
  body: string,
  data?: Record<string, string>,
  excludeUserIds?: string[],
  excludeTokens?: string[],
) {
  const ids = (await getActiveAdminUserIds()).filter((id) => !(excludeUserIds || []).includes(id));
  return sendNotification({ title, body, data, userIds: ids, excludeTokens });
}

export async function sendToAll(title: string, body: string, data?: Record<string, string>, excludeTokens?: string[]) {
  const ids = await sanityClient.fetch<string[]>(`*[_type=="user" && isActive != false]._id`);
  return sendNotification({ title, body, data, userIds: ids || [], excludeTokens });
}

export async function sendToAllEnv(
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  _env: "prod" | "dev",
  excludeTokens?: string[],
) {
  return sendToAll(title, body, data, excludeTokens);
}
