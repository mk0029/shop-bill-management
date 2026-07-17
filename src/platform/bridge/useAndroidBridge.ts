"use client";

import { useEffect, useRef } from "react";
import {
  initializeAndroidBridge,
  sendNativeMessage,
  onNativeEvent,
  isAndroidNativeWrapper,
} from "./androidBridge";

export function useAndroidBridge() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAndroidNativeWrapper()) return;
    if (initialized.current) return;
    initialized.current = true;

    initializeAndroidBridge();

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onNativeEvent("NATIVE_READY", (payload) => {
        console.log("[AndroidBridge] Native ready", payload);
      })
    );

    unsubs.push(
      onNativeEvent("AUTH_REQUIRED", () => {
        window.dispatchEvent(new CustomEvent("jambh:auth-required"));
      })
    );

    unsubs.push(
      onNativeEvent("NOTIFICATION_RECEIVED", (payload) => {
        window.dispatchEvent(
          new CustomEvent("jambh:notification-received", { detail: payload })
        );
      })
    );

    unsubs.push(
      onNativeEvent("NOTIFICATION_OPENED", (payload) => {
        window.dispatchEvent(
          new CustomEvent("jambh:notification-opened", { detail: payload })
        );
      })
    );

    unsubs.push(
      onNativeEvent("UPLOAD_PROGRESS", (payload) => {
        window.dispatchEvent(
          new CustomEvent("jambh:upload-progress", { detail: payload })
        );
      })
    );

    unsubs.push(
      onNativeEvent("UPLOAD_COMPLETED", (payload) => {
        window.dispatchEvent(
          new CustomEvent("jambh:upload-completed", { detail: payload })
        );
      })
    );

    return () => unsubs.forEach((u) => u());
  }, []);
}

export function useNotifyAuth(authState: {
  userId: string;
  accessToken: string;
  role?: string;
  displayName?: string;
} | null) {
  const prevRef = useRef<typeof authState>(null);

  useEffect(() => {
    if (!isAndroidNativeWrapper()) return;
    const prev = prevRef.current;
    prevRef.current = authState;

    if (authState && authState !== prev) {
      sendNativeMessage("AUTH_SESSION_UPDATED", {
        userId: authState.userId,
        accessToken: authState.accessToken,
        role: authState.role || "",
        displayName: authState.displayName || "",
      }).catch(() => {});
    }

    if (!authState && prev) {
      sendNativeMessage("AUTH_LOGOUT", {}).catch(() => {});
    }
  }, [authState]);
}
