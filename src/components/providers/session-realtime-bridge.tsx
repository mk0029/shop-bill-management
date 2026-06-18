"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";
import { SHOP_CHAT_URL } from "@/lib/shop-chat/api";
import { getShopAuthHeader } from "@/lib/shop-chat/auth";
import { getDeviceInfo } from "@/lib/fcm/device";
import { setAutoLogoutInfo } from "@/lib/auto-logout";

function toBase64Url(value: string) {
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch {
    return value;
  }
}

export default function SessionRealtimeBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.id || pathname === "/auto-logout") return;
    const authStorage = getShopAuthHeader();
    if (!authStorage) return;

    const deviceInfo = getDeviceInfo();
    const socket = io(`${SHOP_CHAT_URL}/chat`, {
      autoConnect: true,
      auth: {
        authStorage: toBase64Url(authStorage),
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        presence: false,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      if (deviceInfo.deviceId) {
        socket.emit("device:register", { deviceId: deviceInfo.deviceId });
      }
    });

    socket.on("session:revoked", (payload: { reason?: string; deviceId?: string; loggedInOn?: string; message?: string }) => {
      if (!payload?.deviceId || payload.deviceId !== deviceInfo.deviceId) return;
      setAutoLogoutInfo({
        reason:
          payload?.reason === "DEVICE_LIMIT_EXCEEDED"
            ? "DEVICE_LIMIT_EXCEEDED"
            : "LOGGED_IN_ON_ANOTHER_DEVICE",
        loggedInOn: payload?.loggedInOn,
        message:
          payload?.message ||
          "Your account has been logged out from this device because it was logged in on another device.",
      });
      logout();
      router.replace("/auto-logout");
    });

    return () => {
      socket.disconnect();
    };
  }, [hydrated, isAuthenticated, user?.id, pathname, logout, router]);

  return null;
}
