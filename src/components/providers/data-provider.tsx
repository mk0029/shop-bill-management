"use client";

import { useEffect, ReactNode, useMemo, useState } from "react";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";
import { useOnline } from "@/hooks/use-online";
import { registerFcmToken, listenForegroundMessages } from "@/lib/fcm";
import { toast } from "sonner";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { loadAdminData, loadCustomerData, isLoading, error, lastSyncTime } = useDataStore();
  const { user, role } = useAuthStore();
  const online = useOnline();
  const [notifBusy, setNotifBusy] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [perm, setPerm] = useState<string | undefined>(undefined);
  const canAskNotifications = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    // Only show UI if permission undecided; no longer requires user to be present
    return (perm ?? (typeof Notification !== "undefined" ? Notification.permission : "")) === "default";
  }, [perm]);

  // Auto open the notification prompt modal when eligible
  useEffect(() => {
    if (canAskNotifications) {
      // debug: trace why modal may not show
      try {
        console.log("[Notifications] Opening modal. perm=", Notification.permission);
        setPerm(Notification.permission);
      } catch {}
      setShowNotifModal(true);
    }
  }, [canAskNotifications]);

  // Prove provider is mounted
  useEffect(() => {
    try {
      console.log("[DataProvider] mounted");
    } catch {}
  }, []);

  // Track permission
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setPerm(Notification.permission);
      const onVis = () => {
        try { setPerm(Notification.permission); } catch {}
      };
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    } catch {}
  }, []);

  useEffect(() => {
    // Avoid triggering loads until role is determined
    if (!role) return;
    // Bootstrap only once per app session
    if (lastSyncTime) return;

    if (role === "customer") {
      loadCustomerData({
        userId: user?.id,
        customerId: (user as any)?.customerId,
      });
    } else if (role === "admin") {
      loadAdminData({
        userId: user?.id,
        customerId: (user as any)?.customerId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, lastSyncTime]);

  // Register FCM token once user is available and role determined
  useEffect(() => {
    if (!role) return;
    if (!user?.id) return;
    let unsub: (() => void) | undefined;
    (async () => {
      // Register token
      const res = await registerFcmToken({ userId: user.id });
      if ((res as any)?.error) {
        // Silent fail; optionally show debug toast
        // toast.error("Failed to enable push notifications");
      }
      // Listen for foreground messages
      unsub = await listenForegroundMessages((payload) => {
        const n = (payload as any)?.notification || {};
        const title = n.title || "Notification";
        const body = n.body || "";
        toast(title, {
          description: body,
          action: (payload as any)?.data?.url
            ? {
                label: "Open",
                onClick: () => {
                  const url = (payload as any).data.url as string;
                  if (url) window.location.assign(url);
                },
              }
            : undefined,
        });
      });
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [role, user?.id]);

  // Persist any pending FCM token once a user becomes available
  useEffect(() => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('pending_fcm_token');
      if (!token) return;
      (async () => {
        try {
          const res = await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, userId: user.id }),
          });
          if (res.ok) {
            localStorage.removeItem('pending_fcm_token');
            toast.success('Push notifications enabled for this user');
          } else {
            const body = await res.json().catch(() => ({}));
            toast.error(`Failed to link push token: ${body?.error || res.status}`);
          }
        } catch (e: any) {
          toast.error(`Failed to link push token: ${e?.message || 'Network error'}`);
        }
      })();
    } catch {}
  }, [user?.id]);

  // Extra safety: if we can ask, auto-open after short delay to avoid race
  useEffect(() => {
    if (!canAskNotifications) return;
    const t = setTimeout(() => setShowNotifModal(true), 300);
    return () => clearTimeout(t);
  }, [canAskNotifications]);

  // Force attempt once per session: trigger native request + registration automatically
  useEffect(() => {
    if (!canAskNotifications) return;
    try {
      const key = "notif_attempted_session";
      const attempted = sessionStorage.getItem(key);
      if (!attempted) {
        sessionStorage.setItem(key, "1");
        // Small delay so UI renders first
        const t = setTimeout(() => {
          // Fire request without click; some browsers may still allow this, others may quiet it
          requestNotifications();
        }, 500);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [canAskNotifications]);

  // User-initiated permission request (guarantees browser prompt)
  const requestNotifications = async () => {
    try {
      setNotifBusy(true);
      const res: any = await registerFcmToken({ userId: user?.id });
      if (res?.ok) {
        toast.success("Notifications enabled");
        setShowNotifModal(false);
        try { setPerm(Notification.permission); } catch {}
        // If we enabled before login, persist once user becomes available
        if (res?.pendingSave && user?.id) {
          try {
            const token = localStorage.getItem('pending_fcm_token');
            if (token) {
              await fetch('/api/notifications/register-token', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, userId: user.id }),
              });
              localStorage.removeItem('pending_fcm_token');
            }
          } catch {}
        }
      } else if (res?.skipped) {
        const reason = res.reason || "unknown";
        toast.info(`Notifications not enabled: ${reason}`);
        // If user explicitly denied, close modal
        if (reason === "permission-denied") setShowNotifModal(false);
        try { setPerm(Notification.permission); } catch {}
      } else if (res?.error) {
        toast.error(`Failed to enable notifications: ${res.error}`);
      } else {
        toast.message("Notification request completed");
      }
      // Debug: log full result for diagnosis
      try { console.log("[Notifications] registerFcmToken result:", res); } catch {}
    } finally {
      setNotifBusy(false);
    }
  };

  // Offline-friendly handling: render page and show compact banners
  const retry = () => {
    if (!role) return;
    if (role === "customer") {
      loadCustomerData({ userId: user?.id, customerId: (user as any)?.customerId });
    } else if (role === "admin") {
      loadAdminData({ userId: user?.id, customerId: (user as any)?.customerId });
    }
  };

  const showSyncBanner = online && isLoading && !lastSyncTime;

  return (
    <>
      {/* Inline banners for loading/error states */}
      {!online && (
        <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-yellow-900/60 backdrop-blur border border-yellow-600/40 text-yellow-100 text-sm shadow-lg">
          You are offline. Showing cached data where available.
          <button
            onClick={retry}
            className="ml-3 px-2 py-0.5 rounded bg-yellow-700/60 hover:bg-yellow-700 text-yellow-50 text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Auto notification modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNotifModal(false)} />
          <div className="relative z-[61] w-[90%] max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-100 shadow-2xl">
            <div className="text-base font-medium mb-1">Enable notifications?</div>
            <div className="text-sm text-gray-300 mb-4">
              Get real-time updates for bills, stock changes, and important alerts.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNotifModal(false)}
                className="px-3 py-1 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 text-sm">
                Not now
              </button>
              <button
                disabled={notifBusy}
                onClick={requestNotifications}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm">
                {notifBusy ? "Enabling..." : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncBanner && (
        <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 text-sm shadow">
          Syncing latest data…
        </div>
      )}

      {online && error && (
        <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-red-900/70 backdrop-blur border border-red-700/60 text-red-100 text-sm shadow-lg">
          Failed to load data. <button onClick={retry} className="underline ml-1">Retry</button>
        </div>
      )}

      {children}
    </>
  );
}

// Loading component for individual sections
export function DataLoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full sm:h-8 sm:w-8 h-6 w-6  border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// Error component for individual sections
export function DataError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 text-2xl mb-2">⚠️</div>
        <p className="text-gray-400 text-sm mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-500 hover:text-blue-400 text-sm underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
