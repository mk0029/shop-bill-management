"use client";

import { useAuthStore } from "@/store/auth-store";
import OfflineStatusOverlay from "@/components/online/offline-status-overlay";
import NotificationsBridge from "@/components/realtime/notifications-bridge";
import SWNotificationBridge from "@/components/notifications/sw-bridge";
import DeviceSessionWatcher from "@/components/providers/device-session-watcher";
import SessionRealtimeBridge from "@/components/providers/session-realtime-bridge";
import AskForNotifications from "@/notifications/components/AskForNotifications";
import AutoNotifications from "@/notifications/components/AutoNotifications";
import ForegroundSystemNotifier from "@/notifications/components/ForegroundSystemNotifier";
import NotificationToaster from "@/components/notifications/NotificationToaster";
import NotificationServerSync from "@/components/notifications/NotificationServerSync";
import RegistrationRequestToast from "@/components/realtime/registration-request-toast";

export default function BackgroundFeaturesGate() {
  const role = useAuthStore((s) => s.role);

  const commonFeatures = (
    <>
      <DeviceSessionWatcher />
      <SessionRealtimeBridge />
      <SWNotificationBridge />
      <AskForNotifications />
      <AutoNotifications />
      <NotificationServerSync />
      <ForegroundSystemNotifier />
      <NotificationToaster />
    </>
  );

  if (role === "admin" || role === "super_admin" || role === "technician") {
    return (
      <>
        <OfflineStatusOverlay />
        <NotificationsBridge />
        <RegistrationRequestToast />
        {commonFeatures}
      </>
    );
  }

  if (role === "customer") {
    return (
      <>
        {commonFeatures}
      </>
    );
  }

  return (
    null
  );
}
