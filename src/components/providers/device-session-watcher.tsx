"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { getDeviceInfo } from "@/lib/fcm/device";
import { getDeviceSessionActivation } from "@/lib/fcm";
import { setAutoLogoutInfo } from "@/lib/auto-logout";

const NEW_SESSION_GRACE_MS = 5 * 60 * 1000;

export default function DeviceSessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.id || pathname === "/auto-logout") return;
    let cancelled = false;

    async function check() {
      try {
        const deviceInfo = getDeviceInfo();
        if (!deviceInfo.deviceId) return;
        const activation = getDeviceSessionActivation(user.id);
        if (!activation || activation.deviceId !== deviceInfo.deviceId) return;
        const res = await fetch("/api/notifications/device-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            deviceId: deviceInfo.deviceId,
            activatedAt: activation.activatedAt,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json?.success) return;

        if (json.known === false || json.active !== false) return;
        const activatedAt = Date.parse(String(activation.activatedAt || ""));
        if (Number.isFinite(activatedAt) && Date.now() - activatedAt < NEW_SESSION_GRACE_MS) return;

        setAutoLogoutInfo({
          reason:
            json.reason === "DEVICE_LIMIT_EXCEEDED"
              ? "DEVICE_LIMIT_EXCEEDED"
              : "LOGGED_IN_ON_ANOTHER_DEVICE",
          loggedInOn: json.loggedInOn || undefined,
          message:
            "Your account has been logged out from this device because it was logged in on another device.",
        });
        logout();
        router.replace("/auto-logout");
      } catch {
        // Polling must never interrupt normal app flow.
      }
    }

    const checkWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void check();
    };

    void check();
    window.addEventListener("focus", checkWhenVisible);
    window.addEventListener("online", checkWhenVisible);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", checkWhenVisible);
      window.removeEventListener("online", checkWhenVisible);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [hydrated, isAuthenticated, user?.id, logout, router, pathname]);

  return null;
}
