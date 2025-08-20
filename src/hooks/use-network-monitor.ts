"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type NetworkStatus = {
  online: boolean; // debounced/hysteresis state
  latencyMs: number | null;
  lastUpdated: number | null;
};

interface Options {
  /** milliseconds between pings */
  intervalMs?: number;
  /** request timeout per ping */
  timeoutMs?: number;
  /** endpoint to ping */
  url?: string;
  /** number of consecutive failures to mark offline */
  failThreshold?: number;
  /** number of consecutive successes to mark online */
  successThreshold?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

export function useNetworkMonitor(opts: Options = {}) {
  const {
    intervalMs = 5000,
    timeoutMs = 3000,
    url = "/api/ping",
    failThreshold = 2,
    successThreshold = 2,
  } = opts;
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    latencyMs: null,
    lastUpdated: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureStreak = useRef(0);
  const successStreak = useRef(0);

  const color = useMemo(() => {
    if (!status.online) return "red";
    if (status.latencyMs == null) return "gray";
    if (status.latencyMs > 600) return "red";
    if (status.latencyMs > 200) return "yellow";
    return "green";
  }, [status.online, status.latencyMs]);

  useEffect(() => {
    // On 'online', don't flip state immediately; run a ping cycle first to confirm.
    const onOnline = () => {
      successStreak.current = 0; // require successes again
    };
    const onOffline = () => setStatus((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const ping = async () => {
      const start = performance.now();
      try {
        await withTimeout(fetch(url, { cache: "no-store" }), timeoutMs);
        const end = performance.now();
        successStreak.current += 1;
        failureStreak.current = 0;
        const nextOnline = successStreak.current >= successThreshold ? true : status.online;
        setStatus({ online: nextOnline, latencyMs: Math.round(end - start), lastUpdated: Date.now() });
      } catch {
        failureStreak.current += 1;
        successStreak.current = 0;
        const nextOnline = failureStreak.current >= failThreshold ? false : status.online;
        setStatus((s) => ({ online: nextOnline, latencyMs: s.latencyMs, lastUpdated: Date.now() }));
      }
    };

    // immediate ping once on mount
    ping();
    timerRef.current = setInterval(ping, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs, timeoutMs, url]);

  return { ...status, color } as const;
}
