"use client";

import type { AppNotification, AppNotificationType } from "@/store/notification-store";
import { isNotificationRecent } from "./age";

type CustomerIdentity = {
  userId?: string;
  customerId?: string;
  phone?: string;
  role?: string;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function eventTypeOf(input: Record<string, unknown>) {
  return (
    stringValue(input.type) ||
    stringValue(input.event) ||
    stringValue((input.data as Record<string, unknown> | undefined)?.type) ||
    stringValue((input.data as Record<string, unknown> | undefined)?.event) ||
    "system.general"
  );
}

export function notificationAppType(eventType: string): AppNotificationType {
  if (eventType.startsWith("chat.")) return "chat";
  if (eventType.startsWith("billing.")) return "billing";
  if (eventType === "bill_created" || eventType === "admin_bill_created") return "billing";
  if (eventType.startsWith("bill.")) return "chat";
  if (eventType.includes("payment")) return "payment";
  if (eventType.startsWith("workTask.")) return "system";
  if (eventType.startsWith("toolRent.")) return "system";
  return "system";
}

function routeFor(eventType: string, data: Record<string, unknown>) {
  const explicit = stringValue(data.route) || stringValue(data.route_path) || stringValue(data.link);
  if (explicit) return { pathname: explicit };

  const billId = stringValue(data.billId);
  if (eventType.startsWith("billing.")) {
    return { pathname: "/customer/bills", query: billId ? { open: billId } : undefined };
  }
  if (eventType.startsWith("bill.")) {
    return { pathname: "/customer/bills", query: billId ? { open: billId } : undefined };
  }
  if (eventType.startsWith("chat.")) return { pathname: "/customer/chat" };
  if (eventType.startsWith("workTask.")) return { pathname: "/customer/work-tasks" };
  if (eventType.startsWith("toolRent.")) return { pathname: "/customer/rented-items" };
  return undefined;
}

function isExpired(data: Record<string, unknown>) {
  const expiresAt = stringValue(data.expiresAt);
  if (!expiresAt) return false;
  const expiresTs = Date.parse(expiresAt);
  return Number.isFinite(expiresTs) && expiresTs <= Date.now();
}

export function mapServerNotificationToAppNotification(raw: Record<string, unknown>): AppNotification | null {
  const data = ((raw.data && typeof raw.data === "object" ? raw.data : {}) || {}) as Record<string, unknown>;
  const eventType = eventTypeOf(raw);
  const id = stringValue(raw._id) || stringValue(raw.id);
  const title = stringValue(raw.title);
  const body = stringValue(raw.body) || stringValue(raw.message);
  const createdAt = stringValue(raw.createdAt) || stringValue(raw._createdAt) || new Date().toISOString();
  if (!id || !title || !body || isExpired(data) || !isNotificationRecent(createdAt, undefined, eventType)) return null;

  const billId = stringValue(raw.billId) || stringValue(data.billId);
  const customerId = stringValue(raw.customerId) || stringValue(data.customerId);
  const taskId = stringValue(data.taskId);
  const rentalId = stringValue(data.rentalId);

  return {
    id,
    type: notificationAppType(eventType),
    title,
    body,
    createdAt,
    read: false,
    meta: {
      source: "server",
      type: eventType,
      eventType,
      expiresAt: stringValue(data.expiresAt) || undefined,
      userId: customerId,
      billId,
      taskId,
      rentalId,
      route: routeFor(eventType, { ...data, billId }),
    },
  };
}

export function mapPushNotificationToAppNotification(raw: AppNotification): AppNotification | null {
  const meta = (raw.meta || {}) as Record<string, unknown>;
  const eventType = stringValue(meta.eventType) || stringValue(meta.type) || stringValue(raw.type) || "system.general";
  const mappedType = notificationAppType(eventType);
  if (!raw.id || !raw.title || !raw.body || !isNotificationRecent(raw.createdAt, undefined, eventType)) return null;
  return {
    ...raw,
    type: mappedType,
    meta: {
      ...meta,
      type: eventType,
      eventType,
      route: meta.route || routeFor(eventType, meta),
    },
  };
}

export function isCustomerNotificationVisible(notification: AppNotification, identity: CustomerIdentity) {
  if (identity.role === "admin" || identity.role === "super_admin" || identity.role === "technician") {
    return true;
  }
  if (identity.role !== "customer") return false;

  const eventType = String(notification.meta?.eventType || notification.meta?.type || notification.type || "");
  const targetUserId = String(notification.meta?.userId || "");
  const currentIds = new Set([identity.userId, identity.customerId].filter(Boolean));

  if (eventType === "system.general" || eventType === "shop_status") return true;
  if (eventType === "daily_good_morning" || eventType === "hindu_festival_greeting") return true;
  if (eventType === "bill_created") return !targetUserId || currentIds.has(targetUserId);
  if (eventType === "admin_bill_created") return false;
  if (eventType.startsWith("billing.")) return !targetUserId || currentIds.has(targetUserId);
  if (eventType.startsWith("bill.")) return !targetUserId || currentIds.has(targetUserId);
  if (eventType.startsWith("chat.")) return !targetUserId || currentIds.has(targetUserId);
  if (eventType.startsWith("workTask.")) return !targetUserId || currentIds.has(targetUserId);
  if (eventType.startsWith("toolRent.")) return !targetUserId || currentIds.has(targetUserId);

  return false;
}
