"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { isMessagingAvailable } from "../lib/firebase";
import { ensureFcmToken, registerFcmToken } from "../../lib/fcm";

function getPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export default function EnableNotificationsPrompt() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [supported, setSupported] = useState<boolean>(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    getPermission(),
  );
  const [dismissed, setDismissed] = useState<boolean>(false);
  const shouldShow = useMemo(
    () =>
      !!user &&
      hydrated &&
      isAuthenticated &&
      supported &&
      !dismissed,
    [user, hydrated, isAuthenticated, supported, dismissed],
  );
  const isBlocked = perm === "denied";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isMessagingAvailable();
      if (!cancelled) setSupported(ok);
      if (!cancelled) setPerm(getPermission());
    })();
    const onFocus = () => setPerm(getPermission());
    if (typeof window !== "undefined")
      window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (typeof window !== "undefined")
        window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!shouldShow) return null;

  async function onEnable() {
    try {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {}
      }
      setPerm(getPermission());
      if (Notification.permission === "granted") {
        const userId = user?.id ?? null;
        if (userId) {
          await ensureFcmToken({ userId }).catch(() => {});
          await registerFcmToken({ userId }).catch(() => {});
        }
      }
    } catch {}
  }

  function onNeverAsk() {
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-xl -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900/90 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex flex-col items-start gap-3">
        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
        <div className="flex-1 text-sm text-slate-100">
          <div className="font-medium">
            {isBlocked ? "Notifications blocked" : "Enable notifications"}
          </div>
          <div className="text-slate-300/90">
            {isBlocked
              ? "Notifications are blocked by your browser. Update site settings to Allow."
              : "Turn on push notifications to receive bill and system updates in real time."}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEnable}
            className="inline-flex items-center rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {isBlocked ? "Open Settings" : "Enable"}
          </button>
          <button
            onClick={onNeverAsk}
            className="inline-flex items-center rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Never Ask
          </button>
        </div>
      </div>
    </div>
  );
}
