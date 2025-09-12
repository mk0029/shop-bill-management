"use client";

import { useEffect, useState } from "react";
import { SuccessPopup, type SuccessPopupData } from "@/components/ui/success-popup";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

// Notifications and FCM disabled

export default function NotificationSyncGate() {
  const { isAuthenticated } = useAuthStore();
  const { lastSyncTime } = useDataStore();

  // Notification prompt disabled
  const [popup, setPopup] = useState<SuccessPopupData | null>(null);

  // Foreground notifications are handled centrally by `src/notifications/components/ForegroundSystemNotifier.tsx`.
  // We intentionally avoid initializing any additional foreground listeners here to prevent duplicate OS notifications.

  // Handlers removed (disabled)

  // Show sync-complete popup once when lastSyncTime becomes available after login
  useEffect(() => {
    if (!isAuthenticated || !lastSyncTime || typeof window === "undefined") return;
    const key = `syncPopupShown-${new Date(lastSyncTime).toDateString()}`;
    if (!sessionStorage.getItem(key)) {
      // setPopup({
      //   title: "Sync Complete",
      //   message: "Your data is up to date and real-time updates are active.",
      //   type: "general",
      // });
      sessionStorage.setItem(key, "1");
    }
  }, [isAuthenticated, lastSyncTime]);

  const closePopup = () => setPopup(null);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Notification prompt disabled */}

      <SuccessPopup isOpen={!!popup} onClose={closePopup} data={popup || { title: "", message: "", type: "general" }} autoClose={3000} />
    </>
  );
}
