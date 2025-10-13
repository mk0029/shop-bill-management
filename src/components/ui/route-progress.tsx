"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import LoadingSpinner from "./loading-spinner";

// NProgress + full-screen overlay synced with App Router route changes
export default function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const [percent, setPercent] = useState(0);
  const trickleTimerRef = useRef<number | null>(null);

  // Configure NProgress once
  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.12 });
  }, []);

  // Stable key for route changes
  const navKey = useMemo(() => `${pathname}?${search?.toString() || ""}`, [pathname, search]);

  // Expose manual triggers
  useEffect(() => {
    const start = () => {
      if (active) return;
      setActive(true);
      setPercent(0);
      NProgress.start();
      NProgress.set(0.12);
      // start trickle timer
      if (trickleTimerRef.current) window.clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = window.setInterval(() => {
        setPercent((p) => {
          // ease toward 90% with diminishing increments
          const next = p + Math.max(1, Math.floor((90 - p) / 8));
          const clamped = Math.min(next, 90);
          NProgress.set(Math.max(0.12, clamped / 100));
          return clamped;
        });
      }, 200);
    };
    const done = () => {
      setPercent(100);
      NProgress.set(1);
      NProgress.done();
      // Slight delay before hiding overlay for smoothness
      setTimeout(() => setActive(false), 150);
      if (trickleTimerRef.current) {
        window.clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
    };
    (globalThis as { __routeProgressStart?: () => void }).__routeProgressStart = start;
    (globalThis as { __routeProgressDone?: () => void }).__routeProgressDone = done;
    return () => {
      (globalThis as { __routeProgressStart?: () => void }).__routeProgressStart = undefined;
      (globalThis as { __routeProgressDone?: () => void }).__routeProgressDone = undefined;
    };
  }, [active]);

  // Auto trigger on route change
  useEffect(() => {
    // Start immediately
    setActive(true);
    setPercent(0);
    NProgress.start();
    NProgress.set(0.12);

    // start trickle timer
    if (trickleTimerRef.current) window.clearInterval(trickleTimerRef.current);
    trickleTimerRef.current = window.setInterval(() => {
      setPercent((p) => {
        const next = p + Math.max(1, Math.floor((90 - p) / 8));
        const clamped = Math.min(next, 90);
        NProgress.set(Math.max(0.12, clamped / 100));
        return clamped;
      });
    }, 200);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setPercent(100);
      NProgress.set(1);
      NProgress.done();
      setTimeout(() => setActive(false), 150);
      if (trickleTimerRef.current) {
        window.clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
    };

    // End on next paint after navigation to avoid lingering overlay
    const cleanupRafs: number[] = [];
    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        finish();
      });
      // Ensure cleanup cancels second RAF as well
      cleanupRafs.push(raf2);
    });
    cleanupRafs.push(raf1);

    // Short safety cap in case next paint is delayed
    const safety = window.setTimeout(finish, 800);
    return () => {
      cleanupRafs.forEach((id) => window.cancelAnimationFrame(id));
      window.clearTimeout(safety);
      if (trickleTimerRef.current) {
        window.clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
    };
  }, [navKey]);

  return (
    <>
      {/* Fullscreen overlay while active */}
      {active && (
        <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-3 shadow-xl flex items-center gap-3" aria-live="polite" aria-atomic>
            <LoadingSpinner size="lg" />
            <div className="text-sm text-white font-medium tabular-nums">{percent}%</div>
          </div>
        </div>
      )}
    </>
  );
}
