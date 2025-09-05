"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import LoadingSpinner from "./loading-spinner";

// NProgress + full-screen overlay synced with App Router route changes
export default function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

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
      NProgress.start();
    };
    const done = () => {
      NProgress.done();
      // Slight delay before hiding overlay for smoothness
      setTimeout(() => setActive(false), 150);
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
    NProgress.start();
    const t = window.setTimeout(() => {
      NProgress.done();
      setTimeout(() => setActive(false), 150);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [navKey]);

  return (
    <>
      {/* Fullscreen overlay while active */}
      {active && (
        <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-3 shadow-xl">
            <LoadingSpinner size="lg" text="Loading..." />
          </div>
        </div>
      )}
    </>
  );
}
