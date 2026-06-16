"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import FcmRetryPopup from "@/components/notifications/FcmRetryPopup";
import { useAuthStore } from "../../store/auth-store";

/**
 * AskForNotifications
 * - Shows a custom explanatory prompt before the native OS/browser permission prompt.
 * - Bottom aligned on mobile, centered on desktop to match the app update prompt.
 * - Mount this once globally.
 */
export default function AskForNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [ask, setAsk] = useState<boolean>(true);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [showBlockedWarning, setShowBlockedWarning] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);

  function showBlockedInfo() {
    setShowBlockedWarning(true);
  }

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user) return;

    if (!("Notification" in window)) {
      setAsk(false);
      setShowPrompt(false);
      return;
    }

    if (Notification.permission === "granted") {
      setAsk(false);
      setShowPrompt(false);
      const userId = user?.id ?? null;
      if (userId) {
        import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
          autoRegisterFcmToken(userId).catch(() => {});
        });
      }
      setShowBlockedWarning(false);
      return;
    }

    if (
      ask &&
      (Notification.permission === "default" ||
        Notification.permission === "denied")
    ) {
      setShowPrompt(true);
    }
  }, [hydrated, isAuthenticated, user, ask]);

  useEffect(() => {
    if (!showBlockedWarning) return;
    const timer = window.setTimeout(() => setShowBlockedWarning(false), 10000);
    return () => window.clearTimeout(timer);
  }, [showBlockedWarning]);

  async function allowNotifications() {
    if (requesting || typeof window === "undefined" || !("Notification" in window)) return;

    setRequesting(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success("Notifications enabled!");
        setAsk(false);
        setShowPrompt(false);
        const userId = user?.id ?? null;
        if (userId) {
          import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
            autoRegisterFcmToken(userId).catch(() => {});
          });
        }
      } else if (perm === "denied") {
        showBlockedInfo();
        setAsk(false);
        setShowPrompt(false);
      }
    } catch {
      showBlockedInfo();
      setAsk(false);
      setShowPrompt(false);
    } finally {
      setRequesting(false);
    }
  }

  function dismissPrompt() {
    setAsk(false);
    setShowPrompt(false);
  }

  return (
    <>
      <FcmRetryPopup />
      {showBlockedWarning ? (
        <div className="pointer-events-none fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="pointer-events-auto w-full max-w-md rounded-lg border border-yellow-400/40 bg-yellow-950 p-4 text-center text-yellow-50 shadow-2xl shadow-yellow-950/30">
            <div className="text-base font-semibold text-yellow-100">
              Enable notifications in browser settings
            </div>
            <div className="mx-auto mt-2 max-w-sm text-sm leading-6 text-yellow-200">
              Notifications are blocked by your browser. Open site settings, set Notifications to Allow, then reload.
            </div>
          </div>
        </div>
      ) : null}
      {showPrompt ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center sm:p-6">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-center text-white shadow-2xl sm:p-5">
            <div className="w-full">
              <div className="text-base font-semibold sm:text-base">
                Stay updated with notifications
              </div>
              <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300 sm:text-xs sm:leading-5">
                We'll notify you about important updates. You can change this anytime.
              </div>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              <button
                type="button"
                className="w-full rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200"
                onClick={dismissPrompt}
                disabled={requesting}
              >
                Not now
              </button>
              <button
                type="button"
                className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-70"
                onClick={allowNotifications}
                disabled={requesting}
              >
                {requesting ? "Allowing..." : "Allow"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
