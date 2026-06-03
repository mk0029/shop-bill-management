"use client";

import React from "react";
import { useNotificationStore } from "@/store/notification-store";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import { useAuthStore } from "@/store/auth-store";
import { listNotifications } from "@/lib/notifications-dataset";
import { clearNotifications } from "@/lib/notifications-dataset";
import { useEffect } from "react";
import { toast } from "sonner";
import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";

export default function CustomerNotificationsClient() {
  const { items, unread, markAllRead, clear, markAsRead, clearRead, addMany } =
    useNotificationStore();
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    phone?: string;
  } | null;
  const userId = user?._id || user?.id;
  const role = user?.role;

  useEffect(() => {
    let cancelled = false;
    if (!userId && !user?.phone && role !== "admin") return;
    void (async () => {
      try {
        const resp = await listNotifications({
          userId: userId || undefined,
          role: role || undefined,
          phone: user?.phone || undefined,
          limit: 50,
        });
        const serverItems = Array.isArray((resp as any)?.items)
          ? (resp as any).items
          : [];
        const mapped = serverItems
          .map((n: any) => {
            const createdAt = String(n?.createdAt || new Date().toISOString());
            const event =
              typeof n?.event === "string"
                ? n.event
                : typeof n?.data?.event === "string"
                  ? n.data.event
                  : "";
            const type = (() => {
              if (event === "bill-created" || event === "bill-updated")
                return "billing";
              if (event && String(event).includes("payment")) return "payment";
              return "system";
            })();
            return {
              id: String(n?._id || ""),
              type,
              title: String(n?.title || ""),
              body: String(n?.body || ""),
              createdAt,
              read: false,
              meta: {
                source: "push",
                billId: n?.billId || n?.data?.billId,
                userId: n?.customerId || n?.data?.customerId,
              },
            };
          })
          .filter((x: any) => x.id && x.title && x.body);
        if (!cancelled && mapped.length) addMany(mapped as any);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role, user?.phone, addMany]);

  const handleClearRead = async () => {
    try {
      const ids = (items || []).filter((n) => !!n.read).map((n) => n.id);
      await clearNotifications({
        userId: userId || undefined,
        phone: user?.phone || undefined,
        notificationIds: ids,
      });
    } catch {}
    clearRead();
  };

  const handleClear = async () => {
    try {
      await clearNotifications({
        userId: userId || undefined,
        phone: user?.phone || undefined,
      });
      clear();
      toast.success("Notifications cleared");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to clear notifications",
      );
    }
  };

  return (
    <>
      <SWNotificationBridge />
      <NotificationCenterPanel
        items={items}
        unread={unread}
        onMarkAllRead={markAllRead}
        onClear={handleClear}
        onClearRead={handleClearRead}
        onMarkAsRead={markAsRead}
      />
    </>
  );
}
