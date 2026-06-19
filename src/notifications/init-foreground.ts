"use client";

import { clearAppSystemNotifications } from "@/lib/notifications/dedupe";
import { onForegroundMessage } from "@/notifications/lib/firebase";
import { useNotificationStore } from "@/store/notification-store";
import type { MessagePayload } from "firebase/messaging";

export function initForegroundNotifications() {
  if (typeof window === "undefined") return;

  onForegroundMessage(async (payload: MessagePayload) => {
    const data = payload.data || {};
    const id = String(data.dedupeKey || data.id || data.notificationId || data.eventId || `push-${Date.now()}`);
    const title = payload.notification?.title || data.title || "Notification";
    const body = payload.notification?.body || data.body || "";
    const isScheduledGreeting =
      data.category === "scheduled_greeting" ||
      data.scheduledType === "dailyGreeting" ||
      data.scheduledType === "festivalGreeting";

    if (isScheduledGreeting) {
      clearAppSystemNotifications({ tag: String(data.tag || "scheduled-greeting") });
      useNotificationStore.getState().add({
        id,
        type: "system",
        title,
        body,
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

    useNotificationStore.getState().add({
      id,
      type: "system",
      title,
      body,
      createdAt: new Date().toISOString(),
      meta: {
        type: data.type || "push",
        source: "push",
        route: data.route ? { pathname: data.route } : undefined,
      },
    });
  });
}
