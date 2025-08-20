"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkMonitor } from "@/hooks/use-network-monitor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function OfflinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  // Stricter thresholds and shorter interval to confirm stability
  const { online, latencyMs, lastUpdated } = useNetworkMonitor({ intervalMs: 3000, failThreshold: 2, successThreshold: 3 });
  const mountedAtRef = useRef<number>(Date.now());
  const redirectedRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [confirmedOnline, setConfirmedOnline] = useState(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    const minDwellMs = 4000; // stay on offline page for at least this long
    const hasDwelled = Date.now() - mountedAtRef.current >= minDwellMs;
    const hasRecentPing = typeof lastUpdated === "number" && Date.now() - lastUpdated < 10000;
    const hasConfirmedSuccess = online && latencyMs !== null && hasRecentPing;
    if (hasDwelled && hasConfirmedSuccess) {
      redirectedRef.current = true;
      router.replace(from);
    }
  }, [online, latencyMs, lastUpdated, router, from]);

  const refreshCheck = useCallback(async () => {
    try {
      setChecking(true);
      // Immediate ping with short timeout to verify connectivity now
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        setConfirmedOnline(true);
        // Navigate back immediately on success
        redirectedRef.current = true;
        router.replace(from);
      } else {
        setConfirmedOnline(false);
      }
    } catch {
      setConfirmedOnline(false);
    } finally {
      setChecking(false);
    }
  }, [from, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <WifiOff className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">You are offline</h1>
        <p className="text-gray-400">
          No internet connection detected. Check your connection and try again.
        </p>
        <div className="text-sm text-gray-500">Last latency: {latencyMs ?? "--"} ms</div>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={refreshCheck} disabled={checking}>
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Refresh"}
          </Button>
          <Button
            variant="default"
            onClick={() => router.replace(from)}
            disabled={!confirmedOnline}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
