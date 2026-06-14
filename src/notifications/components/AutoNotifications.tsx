"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../store/auth-store";
import { useNotificationStore } from "../../store/notification-store";
import { getClientApp, isMessagingAvailable } from "../lib/firebase";
import { ensureFcmToken } from "../../lib/fcm";

/**
 * AutoNotifications
 * - Registers FCM service worker
 * - Requests Notification permission (if default)
 * - Logs the user's FCM token to the console
 *
 * This component renders nothing and should be mounted once globally (e.g., in RootLayout).
 */
export default function AutoNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const unread = useNotificationStore((s) => s.unread);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      if (!hydrated || !isAuthenticated || !user?.id) return;

      // 1) Register the Firebase Messaging Service Worker
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
            updateViaCache: "none",
          });
          await registration.update().catch(() => undefined);
          // Clean up legacy/duplicate workers that can cause double notifications
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
              const scope = reg.scope || "";
              // Remove the legacy default FCM scope created by older SDKs
              if (scope.includes("/firebase-cloud-messaging-push-scope")) {
                await reg.unregister().catch(() => {});
              }
            }
          } catch {}
        } catch (err) {
          console.warn(
            "[FCM] SW registration failed (continuing without background notifications)",
            err,
          );
        }
      }

      // 2) Check FCM support
      const supported = await isMessagingAvailable();
      if (!supported) {
        console.info("[FCM] Messaging not supported in this browser/context");
        return;
      }

      // 3) Initialize Firebase app (client)
      getClientApp();

      // 4) Request notification permission if needed
      // DO NOT request permission automatically. Respect user's choice and only act if already granted.
      // Native OS/browser prompt will appear when user explicitly interacts with a feature that needs it.

      if (cancelled) return;

      // 5) Silently ensure this device has an FCM token (only if permission already granted)
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const userId = user?.id ?? null;
        if (userId) {
          await ensureFcmToken({ userId }).catch(() => {});
        }
      }
    }

    init();

    // Re-register token when we come back online
    function handleOnline() {
      if (!user?.id) return;
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        ensureFcmToken({ userId: user.id }).catch(() => {});
      }
    }

    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [user, hydrated, isAuthenticated]);

  // Keep PWA app badge in sync with unread count (supported on Chromium and some platforms)
  useEffect(() => {
    try {
      const n = Number(unread) || 0;
      if (n > 0 && navigator.setAppBadge) {
        navigator.setAppBadge(n).catch(() => {});
      } else if (n === 0) {
        navigator.clearAppBadge?.();
      }
    } catch {}
  }, [unread]);

  return null;
}
