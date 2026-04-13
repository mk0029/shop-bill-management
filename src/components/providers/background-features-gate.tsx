"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import OfflineStatusOverlay from "@/components/online/offline-status-overlay";
import NotificationsBridge from "@/components/realtime/notifications-bridge";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import AskForNotifications from "@/notifications/components/AskForNotifications";
import AutoNotifications from "@/notifications/components/AutoNotifications";
import ForegroundSystemNotifier from "@/notifications/components/ForegroundSystemNotifier";
import NotificationToaster from "@/components/notifications/NotificationToaster";

export default function BackgroundFeaturesGate() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);

  const isCustomerBills = pathname?.startsWith("/customer/bills");

  if (role === "admin") {
    return (
      <>
        <OfflineStatusOverlay />
        <NotificationsBridge />
        <SWNotificationBridge />
        <AskForNotifications />
        <AutoNotifications />
        <ForegroundSystemNotifier />
        <NotificationToaster />
      </>
    );
  }

  if (role === "customer") {
    if (isCustomerBills) {
      return null;
    }

    return (
      <>
        {/* NotificationsBridge removed for customers - they don't need admin notifications */}
        <SWNotificationBridge />
        <AskForNotifications />
        <AutoNotifications />
        <ForegroundSystemNotifier />
        <NotificationToaster />
      </>
    );
  }

  return null;
}
