"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { registerFcmToken } from "../../lib/fcm";
import { toast } from "sonner";

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
  const [dashboardLoaded, setDashboardLoaded] = useState<boolean>(false);
  const toastIdRef = useRef<string | number | null>(null);

  // Helper to show guidance when notifications are hard-blocked by the browser
  function showBlockedInfo() {
    if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);
    toastIdRef.current = toast("Enable notifications in browser settings", {
      description:
        "Notifications are blocked by your browser. Click the padlock icon in the address bar → Site settings → Notifications: Allow, then reload.",
      duration: 15000,
    });
  }

  // Detect when dashboard is loaded by checking for dashboard-related DOM elements or route
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDashboardLoaded = () => {
      const isDashboardRoute =
        window.location.pathname.includes("/dashboard") ||
        window.location.pathname.includes("/admin/dashboard") ||
        window.location.pathname.includes("/customer/bills");
      const hasDashboardContent =
        document.querySelector("[data-dashboard-loaded]") !== null ||
        document.querySelector("h1")?.textContent?.includes("Dashboard") ||
        document.querySelector("h2")?.textContent?.includes("Bills");

      // Set dashboard loaded if any condition is met
      if (isDashboardRoute || hasDashboardContent) {
        setDashboardLoaded(true);
      }
    };

    // Check immediately
    checkDashboardLoaded();

    // Also check when route changes (for SPA navigation)
    const observer = new MutationObserver(() => {
      checkDashboardLoaded();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fallback: set dashboard loaded after a reasonable delay if user is authenticated
    // This ensures notifications aren't blocked indefinitely if dashboard detection fails
    const fallbackTimer = setTimeout(() => {
      if (isAuthenticated && user && !dashboardLoaded) {
        setDashboardLoaded(true);
      }
    }, 3000); // 3 seconds fallback

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [isAuthenticated, user, dashboardLoaded]);

  useEffect(() => {
    // Only proceed if:
    // 1. We're in a browser environment
    // 2. Auth store is hydrated
    // 3. User is authenticated
    // 4. Dashboard has loaded
    // 5. We should still ask for permissions

    if (typeof window === "undefined") return;
    if (!hydrated) return;
    if (!isAuthenticated || !user) return;
    if (!dashboardLoaded) return;

    if (!("Notification" in window)) {
      // Browser/environment does not support notifications
      setAsk(false);
      return;
    }

    // If already granted, no need to ask again
    if (Notification.permission === "granted") {
      setAsk(false);
      // Opportunistically register token on mount if user exists
      const userId = user?.id ?? null;
      if (userId) registerFcmToken({ userId }).catch(() => {});
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
      // This triggers the native OS/browser permission popup
      Promise.resolve(Notification.requestPermission())
        .then((result) => {
          if (result === "granted") {
            setAsk(false);
            const userId = user?.id ?? null;
            if (userId) registerFcmToken({ userId }).catch(() => {});
            if (toastIdRef.current != null) {
              toast.dismiss(toastIdRef.current);
              toastIdRef.current = null;
            }
          } else if (result === "denied") {
            // Show a toast prompting user to enable notifications with an action button
            if (toastIdRef.current == null) {
              toastIdRef.current = toast("Notifications are blocked", {
                description:
                  "Allow push notifications to receive bill and system updates.",
                action: {
                  label: "Allow notifications",
                  onClick: async () => {
                    try {
                      // If browser state is default, we can still trigger the native prompt
                      if (Notification.permission === "default") {
                        const res = await Notification.requestPermission();
                        if (res === "granted") {
                          setAsk(false);
                          const userId = user?.id ?? null;
                          if (userId)
                            registerFcmToken({ userId }).catch(() => {});
                          if (toastIdRef.current != null) {
                            toast.dismiss(toastIdRef.current);
                            toastIdRef.current = null;
                          }
                          return;
                        }
                      }
                      // If permission is denied (most browsers won’t re-prompt), show guidance
                      showBlockedInfo();
                    } catch {
                      showBlockedInfo();
                    }
                  },
                },
                duration: 12000,
              });
            }
          }
        })
        .catch(() => {
          // Ignore errors (user closed prompt, etc.)
        });
    }
  }, [ask, user, hydrated, isAuthenticated, dashboardLoaded]);

  // Re-show toast when user focuses the tab if still denied
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const onFocus = () => {
      if (Notification.permission === "denied") {
        if (toastIdRef.current == null) {
          toastIdRef.current = toast("Notifications are blocked", {
            description:
              "Allow push notifications to receive bill and system updates.",
            action: {
              label: "Allow notifications",
              onClick: async () => {
                try {
                  if (Notification.permission === "default") {
                    const res = await Notification.requestPermission();
                    if (res === "granted") {
                      setAsk(false);
                      const userId = user?.id ?? null;
                      if (userId) registerFcmToken({ userId }).catch(() => {});
                      if (toastIdRef.current != null) {
                        toast.dismiss(toastIdRef.current);
                        toastIdRef.current = null;
                      }
                      return;
                    }
                  }
                  showBlockedInfo();
                } catch {
                  showBlockedInfo();
                }
              },
            },
            duration: 12000,
          });
        }
      } else if (Notification.permission === "granted") {
        if (toastIdRef.current != null) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        }
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  // No custom UI is needed; native prompt handles itself
  return null;
}
