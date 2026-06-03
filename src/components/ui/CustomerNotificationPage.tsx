"use client";

import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import { useMemo } from "react";
import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";

export default function CustomerNotificationsPage() {
  const { items, markAllRead, clear, clearRead, markAsRead } =
    useNotificationStore();
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
  } | null;
  const userId = user?._id || user?.id;
  const userRole = user?.role;

  // Filter notifications for customers - only show relevant ones
  const filteredItems = useMemo(() => {
    // Admins see all notifications
    if (userRole === "admin") return items;

    // Customers should only see:
    // 1. Their own bill/payment notifications
    // 2. Shop status notifications
    if (userRole === "customer") {
      return items.filter((n) => {
        const meta = n.meta;

        // Shop status notifications - all customers should see these
        // Check both meta.type and the notification title/body for shop status
        if (
          meta?.type === "shop_status" ||
          n.title?.includes("Shop is") ||
          n.title?.includes("Available") ||
          n.title?.includes("Offline")
        ) {
          return true;
        }

        if (n.type === "chat" || meta?.type === "shop_chat") {
          return meta?.userId === userId;
        }

        // Bill and payment notifications - only if it's for this customer
        if ((n.type === "billing" || n.type === "payment") && meta?.userId) {
          return meta.userId === userId;
        }

        // Inventory notifications - customers should NOT see these
        if (n.type === "inventory") {
          return false;
        }

        // System notifications without shop_status type - filter out
        if (n.type === "system" && meta?.type !== "shop_status") {
          return false;
        }

        // Default: don't show if we can't determine ownership
        return false;
      });
    }

    // Default: show all for unknown roles (shouldn't happen)
    return items;
  }, [items, userRole, userId]);

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
