"use client";

import { useEffect } from "react";
import { useNotificationStore, type AppNotification } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import {
  isCustomerNotificationVisible,
  mapPushNotificationToAppNotification,
} from "@/lib/notifications/customer";

// Listens to the Service Worker BroadcastChannel and forwards
// incoming notifications into the in-app notification store.
export default function SWNotificationBridge() {
  const add = useNotificationStore((s) => s.add);

  useEffect(() => {
    // Helper to check if user should receive this notification
    const shouldReceiveNotification = (notification: AppNotification): boolean => {
      const auth = useAuthStore.getState();
      const user = auth.user as { id?: string; _id?: string; role?: string; customerId?: string } | null;
      const userId = user?._id || user?.id;
      return isCustomerNotificationVisible(notification, {
        userId: userId || undefined,
        customerId: user?.customerId,
        role: user?.role,
      });
    };

    // Helper to ask the active SW to replay any recent notifications it stored
    const requestRecent = async () => {
      try {
        if (typeof navigator === 'undefined' || !("serviceWorker" in navigator)) return;
        const reg = await navigator.serviceWorker.getRegistration();
        const sw = reg?.active || navigator.serviceWorker.controller;
        if (sw) sw.postMessage('REQUEST_RECENT_NOTIFICATIONS');
      } catch {}
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("app-notifications");
      bc.onmessage = (ev: MessageEvent) => {
        try {
          const msg = ev?.data;
          if (!msg || typeof msg !== "object") return;
          if (msg.type === "notification:received" && msg.payload) {
            const p = mapPushNotificationToAppNotification(msg.payload as AppNotification);
            if (!p) return;
            
            // Filter notifications based on user role and ownership
            if (!shouldReceiveNotification(p)) {
              return;
            }
            
            // Forward others to local store; id/createdAt will be kept or auto-filled
            add({
              type: p.type,
              title: p.title,
              body: p.body,
              meta: p.meta,
              id: p.id,
              createdAt: p.createdAt,
            });
          }
        } catch {}
      };
    } catch {
      // BroadcastChannel not supported; nothing to do.
    }

    // Request any notifications received while app was backgrounded
    void requestRecent();

    // Re-request when tab becomes visible (e.g., returning from background)
    const onVis = () => {
      if (document.visibilityState === 'visible') void requestRecent();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      try {
        if (bc) bc.close();
      } catch {}
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [add]);

  return null;
}
