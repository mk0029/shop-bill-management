"use client";

import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import { useMemo } from "react";
import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";
import { isCustomerNotificationVisible } from "@/lib/notifications/customer";

export default function CustomerNotificationsPage() {
  const { items, markAllRead, clear, clearRead, markAsRead } =
    useNotificationStore();
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    customerId?: string;
  } | null;
  const userId = user?._id || user?.id;
  const userRole = user?.role;

  // Filter notifications for customers - only show relevant ones
  const filteredItems = useMemo(() => {
    return items.filter((notification) =>
      isCustomerNotificationVisible(notification, {
        userId: userId || undefined,
        customerId: user?.customerId,
        role: userRole || undefined,
      }),
    );
  }, [items, userRole, userId, user?.customerId]);

  const filteredUnread = useMemo(() => {
    return filteredItems.filter((n) => !n.read).length;
  }, [filteredItems]);

  return (
    <NotificationCenterPanel
      items={filteredItems}
      unread={filteredUnread}
      title="Notifications"
      subtitle="Chats, bills and shop updates for your account"
      onMarkAllRead={markAllRead}
      onClear={clear}
      onClearRead={clearRead}
      onMarkAsRead={markAsRead}
    />
  );
}
