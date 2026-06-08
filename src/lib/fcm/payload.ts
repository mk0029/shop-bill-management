import type { NotificationData, NotificationEventType } from "@/types/notifications";

export function toStringData(data?: NotificationData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (typeof value === "undefined" || value === null) continue;
    out[String(key)] = String(value);
  }
  return out;
}

export function buildNotificationData(args: {
  id?: string;
  type: NotificationEventType | string;
  title: string;
  body: string;
  data?: NotificationData;
}) {
  const data = toStringData(args.data);
  return {
    ...data,
    ...(args.id ? { id: args.id } : {}),
    tag: data.tag || args.id || "",
    type: String(args.type),
    title: args.title,
    body: args.body,
  };
}

export function hasNotificationText(title: string, body: string) {
  return Boolean(String(title || "").trim() && String(body || "").trim());
}
