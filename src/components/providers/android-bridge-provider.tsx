"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { isAndroidNativeWrapper, initializeAndroidBridge, sendNativeMessage } from "../../platform/bridge/androidBridge";

export default function AndroidBridgeProvider() {
  const initialized = useRef(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const prevAuth = useRef(false);

  useEffect(() => {
    if (!isAndroidNativeWrapper()) return;
    if (initialized.current) return;
    initialized.current = true;

    initializeAndroidBridge();
  }, []);

  useEffect(() => {
    if (!isAndroidNativeWrapper()) return;
    if (!initialized.current) return;

    const was = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (isAuthenticated && !was) {
      const uid = (user as any)?.id || (user as any)?._id;
      if (uid) {
        sendNativeMessage("AUTH_SESSION_UPDATED", {
          userId: uid,
          accessToken: "",
          role: (user as any)?.role || "",
          displayName: (user as any)?.name || "",
        }).catch(() => {});
      }
    }

    if (!isAuthenticated && was) {
      sendNativeMessage("AUTH_LOGOUT", {}).catch(() => {});
    }
  }, [isAuthenticated, user]);

  return null;
}
