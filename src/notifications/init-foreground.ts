"use client";

import { clearAppSystemNotifications } from "@/lib/notifications/dedupe";
import { onForegroundMessage } from "@/notifications/lib/firebase";
import { useNotificationStore } from "@/store/notification-store";
import type { MessagePayload } from "firebase/messaging";

export function initForegroundNotifications() {
  if (typeof window === "undefined") return;

  const ensurePermission = async () => {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  };

  onForegroundMessage(async (payload: MessagePayload) => {
    const data = payload.data || {};
    const isScheduledGreeting =
      data.category === "scheduled_greeting" ||
      data.scheduledType === "dailyGreeting" ||
      data.scheduledType === "festivalGreeting";

    if (isScheduledGreeting) {
      const id = String(data.id || data.notificationId || `scheduled-${data.date || Date.now()}`);
      clearAppSystemNotifications({ tag: String(data.tag || "scheduled-greeting") });
      useNotificationStore.getState().add({
        id,
        type: "system",
        title: payload.notification?.title || data.title || "Notification",
        body: payload.notification?.body || data.body || "",
        createdAt: new Date().toISOString(),
        meta: {
          type: "scheduled_greeting",
          scheduledType: data.scheduledType,
          festivalName: data.festivalName,
          route: data.route ? { pathname: data.route } : undefined,
        },
      });
      return;
    }

    const granted = await ensurePermission();
    if (!granted) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const title = payload.notification?.title || "Notification";
      const options: NotificationOptions = {
        body: payload.notification?.body || "",
        icon: payload.data?.icon || "/je-p-192.png",
        badge: payload.data?.badge || "/je-p-48.png",
        data: {
          link: payload.fcmOptions?.link || payload.data?.click_action || "/",
        },
      } as NotificationOptions;

      await reg.showNotification(title, options);
    } catch (error) {
      console.error("Failed to show foreground notification:", error);
    }
  });
}
