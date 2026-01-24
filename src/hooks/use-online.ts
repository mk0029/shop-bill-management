"use client";
import { useEffect, useState } from "react";

export function useOnline(enabled = true): { online: boolean; setOnline: (online: boolean) => void } {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (!enabled) return;
    let destroyed = false;
    let consecutiveFailures = 0;
    const FAILURE_THRESHOLD = 2; // require 2 failed checks before declaring offline
    const CHECK_INTERVAL_MS = 20000; // 20s
    const TIMEOUT_MS = 3500; // 3.5s network timeout

    const setOnlineSafe = (value: boolean) => {
      if (!destroyed) setOnline(value);
    };

    // Fast-path: browser events
    const on = () => setOnlineSafe(true);
    const off = () => {
      // Don't immediately flip to offline; let heartbeat confirm
      // We'll trigger a check right away
      void checkConnectivity();
    };

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const abortableFetch = async (url: string, opts?: RequestInit, timeoutMs = TIMEOUT_MS) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // Using HEAD to a local static file that exists to avoid CORS
        const res = await fetch(url, { method: "HEAD", cache: "no-store", signal: controller.signal, ...opts });
        return { ok: true, res };
      } catch (e) {
        return { ok: false, error: e } as const;
      } finally {
        clearTimeout(id);
      }
    };

    // Use a local asset that we know exists in /public to avoid CORS and external dependency
    const PING_URL = "/je-192.ico"; // present in public/

    const checkConnectivity = async () => {
      const navOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      const { ok } = await abortableFetch(`${PING_URL}?_=${Date.now()}`);

      if (ok) {
        consecutiveFailures = 0;
        // If fetch succeeded, we are online regardless of navigator
        setOnlineSafe(true);
      } else {
        consecutiveFailures += 1;
        // Declare offline only if navigator also says offline and failures exceed threshold
        const shouldBeOffline = !navOnline && consecutiveFailures >= FAILURE_THRESHOLD;
        if (shouldBeOffline) setOnlineSafe(false);
      }
    };

    // Kick off an initial check shortly after mount to correct false negatives
    const initialTimer = setTimeout(() => {
      void checkConnectivity();
    }, 500);

    // Re-check when tab becomes visible (useful on iOS PWA)
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void checkConnectivity();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Periodic checks
    const interval = setInterval(() => {
      void checkConnectivity();
    }, CHECK_INTERVAL_MS);

    return () => {
      destroyed = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { online, setOnline };
}
