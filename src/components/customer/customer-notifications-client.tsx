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
  const { items, markAllRead, markAsRead, removeWhere, addMany } =
    useNotificationStore();
  const [clearingIds, setClearingIds] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    phone?: string;
    customerId?: string;
  } | null;
  const userId = user?._id || user?.id;
  const role = user?.role;

  const visibleItems = useMemo(() => {
    return items.filter((notification) =>
      isCustomerNotificationVisible(notification, {
        userId: userId || undefined,
        customerId: user?.customerId,
        phone: user?.phone,
        role: role || undefined,
      }),
    );
  }, [items, role, userId, user?.customerId, user?.phone]);

  const visibleUnread = useMemo(() => {
    return visibleItems.filter((notification) => !notification.read).length;
  }, [visibleItems]);

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
    const duration = Math.min(1100, 340 + ids.length * 55);
    await new Promise((resolve) => window.setTimeout(resolve, duration));
  };

  const finishClearAnimation = () => {
    setClearingIds([]);
    setIsClearing(false);
  };

  const clearIds = async (ids: string[], successMessage?: string) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length || isClearing) return;
    setIsClearing(true);
    await playClearAnimation(uniqueIds);
    try {
      await clearNotifications({
        userId: userId || undefined,
        phone: user?.phone || undefined,
        notificationIds: uniqueIds,
      });
      const idSet = new Set(uniqueIds);
      removeWhere((notification) => idSet.has(notification.id));
      if (successMessage) toast.success(successMessage);
      const remaining = visibleItems.filter((notification) => !idSet.has(notification.id));
      if (remaining.length === 0) {
        window.setTimeout(() => onRequestClose?.(), 140);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to clear notifications",
      );
    } finally {
      finishClearAnimation();
    }
  };

  const handleRemove = async (id: string) => {
    await clearIds([id]);
  };

  const handleClearRead = async () => {
    const ids = visibleItems.filter((n) => !!n.read).map((n) => n.id);
    if (!ids.length) return;
    await clearIds(ids);
  };

  const handleClear = async () => {
    const ids = visibleItems.map((n) => n.id);
    if (!ids.length) return;
    await clearIds(ids, "Notifications cleared");
  };

  return (
    <>
      <SWNotificationBridge />
      <NotificationCenterPanel
        items={visibleItems}
        unread={visibleUnread}
        onMarkAllRead={markAllRead}
        onClear={handleClear}
        onClearRead={handleClearRead}
        onMarkAsRead={markAsRead}
        onRemove={handleRemove}
        clearingIds={clearingIdSet}
        isBusy={isClearing}
      />
    </>
  );
}
