"use client";

import { useEffect } from "react";
import { useNotificationStore, type AppNotification } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";

// Listens to the Service Worker BroadcastChannel and forwards
// incoming notifications into the in-app notification store.
export default function SWNotificationBridge() {
  const add = useNotificationStore((s) => s.add);

  useEffect(() => {
    // Helper to check if user should receive this notification
    const shouldReceiveNotification = (notification: AppNotification): boolean => {
      const auth = useAuthStore.getState();
      const user = auth.user as { id?: string; _id?: string; role?: string } | null;
      const userId = user?._id || user?.id;
      const userRole = user?.role;

      // Admins receive all notifications
      if (userRole === 'admin') return true;

      // Customers should only receive:
      // 1. Their own bill/payment notifications (filtered by userId in meta)
      // 2. Their own chat notifications (filtered by userId in meta)
      // 3. Shop status notifications (type: 'system' with shop_status data)
      if (userRole === 'customer') {
        const notifType = notification.type;
        const meta = notification.meta;

        // Shop status notifications - all customers should see these
        // Check both meta.type and the notification title/body for shop status
        if (meta?.type === 'shop_status' || 
            notification.title?.includes('Shop is') || 
            notification.title?.includes('Available') ||
            notification.title?.includes('Offline')) {
          return true;
        }

        // Bill and payment notifications - only if it's for this customer
        if ((notifType === 'billing' || notifType === 'payment') && meta?.userId) {
          return meta.userId === userId;
        }

        // Chat notifications - only if it's for this customer
        if (notifType === 'chat' && meta?.userId) {
          return meta.userId === userId;
        }

        // Inventory and other system notifications - customers should NOT see these
        if (notifType === 'inventory') {
          return false;
        }

        // System notifications without shop_status type - filter out
        if (notifType === 'system' && meta?.type !== 'shop_status') {
          return false;
        }

        // Default: don't show if we can't determine ownership
        return false;
      }

      // Default: don't show for unknown roles
      return false;
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
            const p = msg.payload as AppNotification;
            
            // For in-app notifications, ignore chat from SW to avoid duplicates
            // and rely on realtime chat listeners for context-aware suppression.
            if ((p as AppNotification).type === 'chat') {
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
