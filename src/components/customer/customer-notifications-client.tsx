"use client";

import React from "react";
import { useNotificationStore } from "@/store/notification-store";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import { useAuthStore } from "@/store/auth-store";
import { listNotifications } from "@/lib/notifications-dataset";
import { clearNotifications } from "@/lib/notifications-dataset";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";
import {
  isCustomerNotificationVisible,
  mapServerNotificationToAppNotification,
} from "@/lib/notifications/customer";

export default function CustomerNotificationsClient({
  onRequestClose,
}: {
  onRequestClose?: () => void;
}) {
  const { items, unread, markAllRead, clear, markAsRead, clearRead, addMany } =
    useNotificationStore();
  const [clearingIds, setClearingIds] = useState<string[]>([]);
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    phone?: string;
    customerId?: string;
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
          customerId: user?.customerId || undefined,
          role: role || undefined,
          phone: user?.phone || undefined,
          limit: 50,
        });
        const serverItems = Array.isArray((resp as any)?.items)
          ? (resp as any).items
          : [];
        const mapped = serverItems
          .map((n: any) => mapServerNotificationToAppNotification(n))
          .filter(Boolean)
          .filter((n: any) =>
            isCustomerNotificationVisible(n, {
              userId: userId || undefined,
              customerId: user?.customerId,
              phone: user?.phone,
              role: role || undefined,
            }),
          );
        if (!cancelled && mapped.length) addMany(mapped as any);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role, user?.phone, user?.customerId, addMany]);

  const clearingIdSet = useMemo(() => new Set(clearingIds), [clearingIds]);

  const playClearAnimation = async (ids: string[]) => {
    if (!ids.length) return;
    setClearingIds(ids);
    const duration = Math.min(1200, 360 + ids.length * 70);
    await new Promise((resolve) => window.setTimeout(resolve, duration));
  };

  const finishClearAnimation = () => {
    setClearingIds([]);
    window.setTimeout(() => onRequestClose?.(), 80);
  };

  const handleClearRead = async () => {
    const ids = (items || []).filter((n) => !!n.read).map((n) => n.id);
    if (!ids.length) return;
    await playClearAnimation(ids);
    try {
      await clearNotifications({
        userId: userId || undefined,
        phone: user?.phone || undefined,
        notificationIds: ids,
      });
    } catch {}
    clearRead();
    finishClearAnimation();
  };

  const handleClear = async () => {
    const ids = (items || []).map((n) => n.id);
    if (!ids.length) return;
    await playClearAnimation(ids);
    try {
      await clearNotifications({
        userId: userId || undefined,
        phone: user?.phone || undefined,
      });
      clear();
      toast.success("Notifications cleared");
      finishClearAnimation();
    } catch (e) {
      setClearingIds([]);
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
        clearingIds={clearingIdSet}
      />
    </>
  );
}
