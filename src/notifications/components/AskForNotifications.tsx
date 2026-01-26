"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { toast } from "sonner";
import FcmRetryPopup from "@/components/notifications/FcmRetryPopup";

/**
 * AskForNotifications
 * - Uses native OS/browser Notification permission prompt (no custom UI)
 * - Managed by useState: defaults to true; set to false once user allows (granted)
 * - Mount this once globally (e.g., in RootLayout)
 */
export default function AskForNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [ask, setAsk] = useState<boolean>(true);
  const toastIdRef = useRef<string | number | null>(null);

  // Helper to show guidance when notifications are hard-blocked by the browser
  function showBlockedInfo() {
    if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);
    toastIdRef.current = toast("Enable notifications in browser settings", {
      description:
        "Notifications are blocked by your browser. Click the padlock icon in the address bar → Site settings → Notifications: Allow, then reload.",
      duration: 10000,
    });
  }

  // Main effect: ask for permission if needed
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user) return;

    // If notifications are not supported, do nothing
    if (!("Notification" in window)) {
      setAsk(false);
      return;
    }

    // If already granted, no need to ask again
    if (Notification.permission === "granted") {
      setAsk(false);
      // Opportunistically auto-register token on mount if user exists
      const userId = user?.id ?? null;
      if (userId) {
        // Import autoRegisterFcmToken dynamically to avoid circular deps
        import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
          autoRegisterFcmToken(userId).catch(() => {});
        });
      }
      // Dismiss any existing toast (if any)
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    // Request permission if we should ask and the current state is default or denied
    if (
      ask &&
      (Notification.permission === "default" ||
        Notification.permission === "denied")
    ) {
      // Show a toast first to explain why we're asking
      if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);
      toastIdRef.current = toast("Stay updated with notifications", {
        description:
          "We’ll notify you about important updates. You can change this anytime.",
        action: {
          label: "Allow",
          onClick: async () => {
            try {
              const perm = await Notification.requestPermission();
              if (perm === "granted") {
                toast.success("Notifications enabled!");
                setAsk(false);
                // Auto-register token after permission granted
                const userId = user?.id ?? null;
                if (userId) {
                  import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
                    autoRegisterFcmToken(userId).catch(() => {});
                  });
                }
              } else if (perm === "denied") {
                showBlockedInfo();
                setAsk(false);
              }
            } catch {
              showBlockedInfo();
              setAsk(false);
            }
          },
        },
        cancel: {
          label: "Not now",
          onClick: () => {
            setAsk(false);
          },
        },
        duration: 15000,
        onDismiss: () => {
          toastIdRef.current = null;
        },
      });
    }
  }, [hydrated, isAuthenticated, user, ask]);

  return (
    <>
      <FcmRetryPopup />
      {/* No UI: this component only manages permission flow */}
    </>
  );
}
