"use client";

import { useCallback, useEffect, useRef } from "react";
import { listNotifications } from "@/lib/notifications-dataset";
import {
  isCustomerNotificationVisible,
  mapServerNotificationToAppNotification,
} from "@/lib/notifications/customer";
import { useAuthStore } from "@/store/auth-store";
import {
  type AppNotification,
  useNotificationStore,
} from "@/store/notification-store";

type SyncUser = {
  id?: string;
  _id?: string;
  role?: string;
  phone?: string;
  customerId?: string;
} | null;

function isAppNotification(
  notification: AppNotification | null,
): notification is AppNotification {
  return Boolean(notification);
}

export default function NotificationServerSync() {
  const user = useAuthStore((s) => s.user) as SyncUser;
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addMany = useNotificationStore((s) => s.addMany);
  const inFlightRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);

  const userId = user?._id || user?.id;
  const role = user?.role;
  const phone = user?.phone;
  const customerId = user?.customerId;

  const syncNotifications = useCallback(async () => {
    if (!hydrated || !isAuthenticated) return;
    if (
      !userId &&
      !phone &&
      role !== "admin" &&
      role !== "super_admin" &&
      role !== "technician"
    ) {
      return;
    }
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      const resp = await listNotifications({
        userId: userId || undefined,
        customerId: customerId || undefined,
        role: role || undefined,
        phone: phone || undefined,
        limit: 75,
      });
      const serverItems = Array.isArray(resp?.items) ? resp.items : [];
      const mapped = serverItems
        .map((notification) =>
          mapServerNotificationToAppNotification(notification),
        )
        .filter(isAppNotification)
        .filter((notification) =>
          isCustomerNotificationVisible(notification, {
            userId: userId || undefined,
            customerId: customerId || undefined,
            phone: phone || undefined,
            role: role || undefined,
          }),
        );

      if (mapped.length) addMany(mapped);
    } catch {
      // Best-effort background sync; the panel can still render persisted local state.
    } finally {
      inFlightRef.current = false;
    }
  }, [addMany, customerId, hydrated, isAuthenticated, phone, role, userId]);

  useEffect(() => {
    void syncNotifications();
  }, [syncNotifications]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;

    const scheduleSync = (delay = 0) => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void syncNotifications();
      }, delay);
    };

    const onFocus = () => scheduleSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("app-notifications");
      channel.onmessage = (event: MessageEvent) => {
        const message = event.data as { type?: string } | undefined;
        if (message?.type === "notification:received") {
          scheduleSync(1200);
        }
      };
    } catch {}

    const interval = window.setInterval(() => {
      void syncNotifications();
    }, 30_000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      try {
        channel?.close();
      } catch {}
    };
  }, [hydrated, isAuthenticated, syncNotifications]);

  return null;
}
