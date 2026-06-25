"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import FcmRetryPopup from "@/components/notifications/FcmRetryPopup";
import { useAuthStore } from "../../store/auth-store";

const NEVER_ASK_KEY = "pwa-never-ask-notifications";

function getNeverAsk(): boolean {
  try {
    return localStorage.getItem(NEVER_ASK_KEY) === "1";
  } catch {
    return false;
  }
}

function setNeverAsk() {
  try {
    localStorage.setItem(NEVER_ASK_KEY, "1");
  } catch {}
}

export default function AskForNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [showBlockedWarning, setShowBlockedWarning] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);

  const evaluatePermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setShowPrompt(false);
      return;
    }

    if (getNeverAsk()) {
      setShowPrompt(false);
      setShowBlockedWarning(false);
      return;
    }

    const perm = Notification.permission;

    if (perm === "granted") {
      setShowPrompt(false);
      setShowBlockedWarning(false);
      const userId = user?.id ?? null;
      if (userId) {
        import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
          autoRegisterFcmToken(userId).catch(() => {});
        });
      }
      return;
    }

    if (perm === "default") {
      setShowPrompt(true);
      setShowBlockedWarning(false);
    } else if (perm === "denied") {
      setShowBlockedWarning(true);
      setShowPrompt(false);
    }
  }, [user]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user) return;
    evaluatePermission();
  }, [hydrated, isAuthenticated, user, evaluatePermission]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => evaluatePermission();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [evaluatePermission]);

  useEffect(() => {
    if (!showBlockedWarning) return;
    const timer = window.setTimeout(() => setShowBlockedWarning(false), 10000);
    return () => window.clearTimeout(timer);
  }, [showBlockedWarning]);

  function closeModals() {
    setShowPrompt(false);
    setShowBlockedWarning(false);
  }

  async function allowNotifications() {
    if (
      requesting ||
      typeof window === "undefined" ||
      !("Notification" in window)
    )
      return;

    setRequesting(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success("Notifications enabled!");
        closeModals();
        const userId = user?.id ?? null;
        if (userId) {
          import("../../lib/fcm").then(({ autoRegisterFcmToken }) => {
            autoRegisterFcmToken(userId).catch(() => {});
          });
        }
      } else if (perm === "denied") {
        setShowBlockedWarning(true);
        setShowPrompt(false);
      }
    } catch {
      setShowBlockedWarning(true);
      setShowPrompt(false);
    } finally {
      setRequesting(false);
    }
  }

  function dismissPrompt() {
    closeModals();
  }

  function handleNeverAsk() {
    setNeverAsk();
    closeModals();
  }

  function handleRecheck() {
    setShowBlockedWarning(false);
    evaluatePermission();
  }

  return (
    <>
      <FcmRetryPopup />
      {showBlockedWarning ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center sm:p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-center shadow-2xl">
            <div className="text-base sm:text-lg font-semibold text-white">
              Notifications are off
            </div>
            <div className="text-sm sm:text-base leading-6 text-slate-300">
              You won't receive alerts. You can enable them later in browser settings.
            </div>
            <div className="flex w-full gap-3 pt-2">
              <button
                type="button"
                onClick={handleNeverAsk}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={closeModals}
                className="flex-1 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showPrompt ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center sm:p-6 bg-slate-950/50 backdrop-blur-sm">
          <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-center text-white shadow-2xl sm:p-5">
            <button
              type="button"
              onClick={closeModals}
              className="absolute right-3 top-3 text-slate-400 hover:text-white text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
            <div className="w-full">
              <div className="text-base font-semibold sm:text-base">
                Stay updated with notifications
              </div>
              <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300 sm:text-xs sm:leading-5">
                We'll notify you about important updates. You can change this
                anytime.
              </div>
            </div>
            <div className="grid w-full max-w-sm grid-cols-3 gap-2">
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
                className="w-full rounded-md border border-red-800/50 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900/20"
                onClick={handleNeverAsk}
                disabled={requesting}
              >
                Don't ask again
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
