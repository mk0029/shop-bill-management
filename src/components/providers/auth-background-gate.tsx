"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { unregisterFcmToken } from "@/lib/fcm";
import { useDataStore } from "@/store/data-store";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useSanityRealtimeStore } from "@/store/sanity-realtime-store";

interface AuthBackgroundGateProps {
  children: ReactNode;
}

async function unregisterAllServiceWorkers() {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister().catch(() => {})));
  } catch {
    // best effort
  }
}

async function cleanupBackground(userId?: string | null) {
  try {
    if (userId) {
      await unregisterFcmToken({ userId });
    }
  } catch {
    // best effort
  }

  try {
    useSanityRealtimeStore.getState().disconnect();
  } catch {}

  try {
    useDataStore.getState().cleanupRealtimeListeners();
  } catch {}

  try {
    useBrandStore.getState().cleanupRealtimeListeners();
  } catch {}

  try {
    useCategoryStore.getState().cleanupRealtimeListeners();
  } catch {}

  try {
    useInventoryStore.getState().cleanupRealtime();
  } catch {}

  await unregisterAllServiceWorkers();
}

export default function AuthBackgroundGate({
  children,
}: AuthBackgroundGateProps) {
  const { isAuthenticated, hydrated, user } = useAuthStore();
  const wasAuthenticatedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const userId =
    (user as { id?: string; _id?: string } | null)?.id ||
    (user as { id?: string; _id?: string } | null)?._id ||
    null;

  useEffect(() => {
    if (userId) lastUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;

    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }

    if (wasAuthenticatedRef.current) {
      wasAuthenticatedRef.current = false;
      const prevUserId = lastUserIdRef.current;
      void cleanupBackground(prevUserId);
    }
  }, [hydrated, isAuthenticated]);

  if (!hydrated || !isAuthenticated) return null;

  return <>{children}</>;
}
