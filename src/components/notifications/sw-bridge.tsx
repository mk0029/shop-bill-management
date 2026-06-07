"use client";

import { useEffect } from "react";
import { useNotificationStore, type AppNotification } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import {
  clearAppSystemNotifications,
  markNotificationHandled,
  notificationIdentity,
  wasNotificationHandled,
  getActiveChatId,
  postNotificationWorkerMessage,
} from "@/lib/notifications/dedupe";
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

    let bc: BroadcastChannel | null = null;
    const handleWorkerMessage = (data: unknown) => {
      try {
        const msg = data as { type?: string; payload?: Record<string, unknown> };
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "notification:clicked" && msg.payload) {
          const id = notificationIdentity(msg.payload);
          markNotificationHandled(id);
          if (msg.payload.messageId) markNotificationHandled(msg.payload.messageId);
        }
      } catch {}
    };
    try {
      bc = new BroadcastChannel("app-notifications");
      bc.onmessage = (ev: MessageEvent) => {
        try {
          const msg = ev?.data;
          if (!msg || typeof msg !== "object") return;
          if (msg.type === "notification:clicked" && msg.payload) {
            const payload = msg.payload as Record<string, unknown>;
            const id = notificationIdentity(payload);
            markNotificationHandled(id);
            if (payload.messageId) markNotificationHandled(payload.messageId);
            return;
          }
          if (msg.type === "notification:received" && msg.payload) {
            const p = mapPushNotificationToAppNotification(msg.payload as AppNotification);
            if (!p) return;
            const meta = p.meta || {};
            const id = notificationIdentity({
              id: p.id,
              notificationId: meta.id || meta.notificationId,
              messageId: meta.messageId,
              roomId: meta.roomId,
              tag: meta.tag,
            });
            if (wasNotificationHandled(id) || wasNotificationHandled(meta.messageId)) return;
            if (meta.type === "shop_chat" && meta.roomId && getActiveChatId() === String(meta.roomId)) {
              markNotificationHandled(id);
              if (meta.messageId) markNotificationHandled(meta.messageId);
              clearAppSystemNotifications({ roomId: String(meta.roomId) });
              return;
            }
            
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

    clearAppSystemNotifications();

    const onVis = () => {
      if (document.visibilityState === 'visible') clearAppSystemNotifications();
    };
    const onFocus = () => clearAppSystemNotifications();
    const onMessage = (event: MessageEvent) => handleWorkerMessage(event.data);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    navigator.serviceWorker?.addEventListener?.('message', onMessage);
    void postNotificationWorkerMessage({ type: "CLEAR_RECENT_NOTIFICATIONS" });

    return () => {
      try {
        if (bc) bc.close();
      } catch {}
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      navigator.serviceWorker?.removeEventListener?.('message', onMessage);
    };
  }, [add]);

  return null;
}
