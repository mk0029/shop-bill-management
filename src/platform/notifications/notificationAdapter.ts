import type { MessagePayload } from "firebase/messaging";

export type NotificationPermission = "granted" | "denied" | "unsupported" | "default";

export interface ForegroundMessage {
  notificationId: string;
  eventId: string;
  eventType: string;
  title: string;
  body: string;
  route?: string;
  entityType?: string;
  entityId?: string;
  roomId?: string;
  userId?: string;
}

export interface NotificationAdapter {
  requestPermission(): Promise<NotificationPermission>;
  getPermission(): NotificationPermission;
  getToken(options?: { forceRefresh?: boolean }): Promise<string | null>;
  registerDevice(userId: string): Promise<boolean>;
  unregisterDevice(userId: string): Promise<boolean>;
  listenForeground(handler: (msg: ForegroundMessage) => void): () => void;
  isSupported(): boolean;
}

export function mapFirebasePayload(payload: MessagePayload): ForegroundMessage {
  const data = payload.data || {};
  return {
    notificationId: data.notificationId || payload.messageId || "",
    eventId: data.eventId || "",
    eventType: data.eventType || "unknown",
    title: payload.notification?.title || data.title || "",
    body: payload.notification?.body || data.body || "",
    route: data.route || "",
    entityType: data.entityType || "",
    entityId: data.entityId || "",
    roomId: data.roomId || "",
    userId: data.userId || "",
  };
}
