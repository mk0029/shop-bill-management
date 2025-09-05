"use client";
import { useEffect } from "react";

import { usePathname } from "next/navigation";
import { useOnline } from "../../hooks/use-online";
import { useAuthStore } from "../../store/auth-store";
import { flushQueue } from "../../lib/offline-queue";

export default function OfflineSync() {
  const online = useOnline();
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    // Run only when online AND after user is authenticated
    if (!online || !isAuthenticated) return;
    // Extra safety: avoid firing on auth routes
    if (pathname?.startsWith("/login") || pathname?.startsWith("/auth")) return;
    let cancelled = false;
    (async () => {
      try {
        await flushQueue();
      } catch (e) {
        // Silent fail; will retry automatically when online again
      }
    })();
    return () => { cancelled = true; };
  }, [online, isAuthenticated, pathname]);

  return null;
}
