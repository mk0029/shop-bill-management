"use client";

import { useEffect, useMemo, useState } from "react";

export type NetworkStatus = {
  online: boolean; // browser online status
  latencyMs: number | null; // removed real-time ping; always null
  lastUpdated: number | null; // timestamp when status last changed
};

// Options kept for backward compatibility but no longer used.
interface Options {
  intervalMs?: number;
  timeoutMs?: number;
  url?: string;
  failThreshold?: number;
  successThreshold?: number;
}

export function useNetworkMonitor(_opts: Options = {}) {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    latencyMs: null,
    lastUpdated: null,
  });

  const color = useMemo(() => {
    // With latency removed, color reflects simple online/offline
    return status.online ? "green" : "red";
  }, [status.online]);

  useEffect(() => {
    const onOnline = () =>
      setStatus({ online: true, latencyMs: null, lastUpdated: Date.now() });
    const onOffline = () =>
      setStatus({ online: false, latencyMs: null, lastUpdated: Date.now() });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  // No pinging effect; rely solely on browser online/offline events.

  return { ...status, color } as const;
}
