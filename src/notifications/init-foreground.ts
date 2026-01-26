"use client";
import { onForegroundMessage } from "@/notifications/lib/firebase";
import type { MessagePayload } from "firebase/messaging";

export function initForegroundNotifications() {
  if (typeof window === "undefined") return;

  const ensurePermission = async () => {
    if (!("Notification" in window)) return false;
    // Do not request permission automatically; only proceed if already granted
    return Notification.permission === "granted";
  };

  // Start listener
  onForegroundMessage(async (payload: MessagePayload) => {
    console.log('🔔 FCM Foreground Message Received:', payload);
    
    const granted = await ensurePermission();
    if (!granted) {
      console.log('❌ Permission not granted for foreground notification');
      return; // fall back to in-app only
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const title = payload.notification?.title || "Notification";
      const options: NotificationOptions = {
        body: payload.notification?.body || "",
        icon: payload.data?.icon || "/je-192.ico",
        badge: payload.data?.badge || "/je-192.ico",
        data: {
          link: payload.fcmOptions?.link || payload.data?.click_action || "/",
        },
      } as any; // Type assertion to allow custom properties

      console.log('📱 Showing foreground notification:', title, options);
      // Show native toast even when tab is open so users see it if app is backgrounded
      await reg.showNotification(title, options);
      console.log('✅ Foreground notification displayed successfully');
    } catch (error) {
      console.error('❌ Failed to show foreground notification:', error);
    }
  });
}
