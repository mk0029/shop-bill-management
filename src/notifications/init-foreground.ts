"use client";
import { onForegroundMessage } from "@/notifications/lib/firebase";
import type { MessagePayload } from "firebase/messaging";

export function initForegroundNotifications() {
  if (typeof window === "undefined") return;

  const ensurePermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const res = await Notification.requestPermission();
      return res === "granted";
    } catch {
      return false;
    }
  };

  // Start listener
  onForegroundMessage(async (payload: MessagePayload) => {
    const granted = await ensurePermission();
    if (!granted) return; // fall back to in-app only

    try {
      const reg = await navigator.serviceWorker.ready;
      const title = payload.notification?.title || "Notification";
      const options: NotificationOptions = {
        body: payload.notification?.body || "",
        icon: payload.data?.icon || "/je-192.ico",
        badge: payload.data?.badge || "/je-192.ico",
        image: payload.data?.image,
        data: {
          link: payload.fcmOptions?.link || payload.data?.click_action || "/",
        },
      };

      // Show native toast even when tab is open so users see it if app is backgrounded
      await reg.showNotification(title, options);
    } catch {
      // noop
    }
  });
}
