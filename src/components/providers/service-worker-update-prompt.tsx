"use client";

import { useEffect, useRef, useState } from "react";

type WaitingWorkerState = {
  registration: ServiceWorkerRegistration;
  worker: ServiceWorker;
};

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function ServiceWorkerUpdatePrompt() {
  const [waiting, setWaiting] = useState<WaitingWorkerState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;

    const onControllerChange = () => {
      try {
        if (!acceptedRef.current || refreshing) return;
        setRefreshing(true);
        window.location.reload();
      } catch {
        setRefreshing(false);
      }
    };

    const watchRegistration = (reg: ServiceWorkerRegistration) => {
      registration = reg;
      if (reg.waiting) {
        setWaiting({ registration: reg, worker: reg.waiting });
      }

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (disposed) return;
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting({ registration: reg, worker });
          }
        });
      });
    };

    try {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    } catch {
      return;
    }

    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (disposed) return;
        watchRegistration(reg);
        return reg.update().catch(() => undefined);
      })
      .catch(() => undefined);

    const checkForUpdate = () => {
      if (document.visibilityState !== "visible") return;
      registration?.update().catch(() => undefined);
    };

    const interval = window.setInterval(() => {
      registration?.update().catch(() => undefined);
    }, isStandaloneApp() ? 15 * 60 * 1000 : 60 * 60 * 1000);

    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
    };
  }, [refreshing]);

  if (!waiting) return null;

  const applyUpdate = () => {
    acceptedRef.current = true;
    setRefreshing(true);
    try {
      waiting.worker.postMessage("SKIP_WAITING");
      window.setTimeout(() => window.location.reload(), 2000);
    } catch {
      setRefreshing(false);
      setWaiting(null);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-4 sm:bottom-5 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">App update ready</div>
          <div className="mt-1 text-xs text-slate-300">
            Refresh to use the latest notification logic and offline updates.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200"
            onClick={() => setWaiting(null)}
          >
            Later
          </button>
          <button
            type="button"
            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
            onClick={applyUpdate}
            disabled={refreshing}
          >
            {refreshing ? "Updating..." : "Update now"}
          </button>
        </div>
      </div>
    </div>
  );
}
