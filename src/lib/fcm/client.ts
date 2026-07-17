"use client";

import type { MessagePayload } from "firebase/messaging";
import { getFcmToken, onForegroundMessage, ensureMessagingServiceWorker } from "@/lib/firebase/messaging";
import { getDeviceInfo } from "./device";
import { logClientError, normalizeUnknownError, safeStorageAvailable } from "@/lib/client-error-logger";

const REGISTERED_KEY = (userId: string) => `fcm-registered:${userId}`;
const PENDING_KEY = (userId: string) => `fcm-pending-token:${userId}`;
const DEVICE_SESSION_KEY = (userId: string) => `device-session-active:${userId}`;

type RegisterResult = {
  success: boolean;
  token?: string;
  deviceId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const json = await response.json().catch(() => ({}));
    return { response, json };
  } finally {
    window.clearTimeout(timer);
  }
}

function queueDeviceSessionRetry(userId: string, deviceInfo: ReturnType<typeof getDeviceInfo>) {
  try {
    window.setTimeout(() => {
      void fetchJsonWithTimeout(
        "/api/notifications/register-device",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, deviceInfo }),
        },
        8000,
      ).catch(() => undefined);
    }, 2000);
  } catch {}
}

export type DeviceSessionActivation = {
  userId: string;
  deviceId: string;
  deviceName?: string;
  activatedAt: string;
};

function getCurrentAuthUser() {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith("auth-storage="))
      ?.split("=")[1];
    if (!cookie) return "";
    const parsed = JSON.parse(decodeURIComponent(cookie));
    const user = parsed?.state?.user || {};
    return {
      role: String(parsed?.state?.role || user.role || "").trim(),
      displayName: String(user.name || user.email || user.phone || "").trim(),
    };
  } catch {
    return { role: "", displayName: "" };
  }
}

export async function requestNotificationPermission() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return await Notification.requestPermission();
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.permission",
      message: normalized.message,
      stack: normalized.stack,
    });
    return "unsupported";
  }
}

export async function getTokenWithoutRegister() {
  return getFcmToken();
}

export async function requestNotificationPermissionAndGetToken(userId: string) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;
  const result = await autoRegisterFcmToken(userId);
  return result.token || null;
}

export async function autoRegisterFcmToken(
  userId: string,
  options: { forceRefresh?: boolean } = {},
): Promise<RegisterResult> {
  try {
    if (!userId || typeof window === "undefined") return { success: false, skipped: true, reason: "no-user" };
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return { success: false, skipped: true, reason: "permission-not-granted" };
    }

    await ensureMessagingServiceWorker().catch(() => undefined);
    const token = await getFcmToken({ forceRefresh: options.forceRefresh });
    if (!token) return { success: false, skipped: true, reason: "no-token" };

    const authUser = getCurrentAuthUser();
    const deviceInfo = { ...getDeviceInfo(), role: authUser.role, displayName: authUser.displayName };
    console.info("[FCM_TRACE] register_client_user_id", userId);
    console.info("[FCM_TRACE] register_client_device_id", deviceInfo.deviceId || "");

    const res = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token, role: deviceInfo.role, displayName: deviceInfo.displayName, deviceInfo }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.success) {
      console.warn("[FCM] Registration incomplete, storing for retry:", {
        httpStatus: res.status,
        success: json?.success,
        backendRegistered: json?.backendRegistered,
        error: json?.error || json?.backendError,
      });
      try {
        if (safeStorageAvailable("localStorage")) {
          localStorage.setItem(PENDING_KEY(userId), JSON.stringify({ token, deviceInfo, ts: Date.now() }));
        }
      } catch {}
      return { success: false, error: json?.error || "registration-failed" };
    }

    try {
      if (safeStorageAvailable("localStorage")) {
        localStorage.removeItem(PENDING_KEY(userId));
        localStorage.setItem(REGISTERED_KEY(userId), JSON.stringify({ token, deviceId: deviceInfo.deviceId, ts: Date.now() }));
      }
    } catch {}

    return { success: true, token, deviceId: deviceInfo.deviceId };
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.auto-register",
      userId,
      message: normalized.message,
      stack: normalized.stack,
    });
    return { success: false, skipped: true, reason: "fcm-unavailable" };
  }
}

export async function registerDeviceSession(userId: string): Promise<RegisterResult> {
  try {
    if (!userId || typeof window === "undefined") return { success: false, skipped: true, reason: "no-user" };
    const deviceInfo = getDeviceInfo();
    if (!deviceInfo.deviceId) return { success: false, skipped: true, reason: "no-device" };

    const { response: res, json } = await fetchJsonWithTimeout(
      "/api/notifications/register-device",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, deviceInfo }),
      },
      8000,
    );
    if (!res.ok || !json?.success) {
      markDeviceSessionActivated(userId, {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        activatedAt: new Date().toISOString(),
      });
      queueDeviceSessionRetry(userId, deviceInfo);
      return {
        success: true,
        skipped: true,
        reason: json?.error || "device-registration-delayed",
        deviceId: deviceInfo.deviceId,
      };
    }
    markDeviceSessionActivated(userId, {
      userId,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      activatedAt: new Date().toISOString(),
    });
    return { success: true, deviceId: deviceInfo.deviceId };
  } catch (error) {
    const deviceInfo = getDeviceInfo();
    if (deviceInfo.deviceId) {
      markDeviceSessionActivated(userId, {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        activatedAt: new Date().toISOString(),
      });
      queueDeviceSessionRetry(userId, deviceInfo);
    }
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.device-session",
      userId,
      message: normalized.message,
      stack: normalized.stack,
    });
    return {
      success: true,
      skipped: true,
      reason: "device-registration-delayed",
      deviceId: deviceInfo.deviceId,
    };
  }
}

export function markDeviceSessionActivated(userId: string, activation: DeviceSessionActivation) {
  try {
    if (!userId || typeof window === "undefined" || !safeStorageAvailable("localStorage")) return;
    localStorage.setItem(DEVICE_SESSION_KEY(userId), JSON.stringify(activation));
  } catch {}
}

export function getDeviceSessionActivation(userId: string): DeviceSessionActivation | null {
  try {
    if (!userId || typeof window === "undefined" || !safeStorageAvailable("localStorage")) return null;
    const parsed = JSON.parse(localStorage.getItem(DEVICE_SESSION_KEY(userId)) || "null");
    return parsed?.deviceId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDeviceSessionActivation(userId?: string | null) {
  try {
    if (!userId || typeof window === "undefined" || !safeStorageAvailable("localStorage")) return;
    localStorage.removeItem(DEVICE_SESSION_KEY(userId));
  } catch {}
}

export async function retryPendingFcmToken(userId: string) {
  try {
    if (!userId || typeof window === "undefined") return { success: false, reason: "no-user" };
    if (!safeStorageAvailable("localStorage")) return { success: false, reason: "storage-unavailable" };
    const raw = localStorage.getItem(PENDING_KEY(userId));
    if (!raw) return { success: false, reason: "no-pending" };
    const pending = JSON.parse(raw) as { token?: string; deviceInfo?: unknown };
    if (!pending.token) return { success: false, reason: "no-token" };
    const authUser = getCurrentAuthUser();
    const deviceInfo = { ...(pending.deviceInfo || getDeviceInfo()), role: authUser.role, displayName: authUser.displayName };
    const res = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token: pending.token, role: deviceInfo.role, displayName: deviceInfo.displayName, deviceInfo }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      console.warn("[FCM] Retry registration incomplete:", {
        httpStatus: res.status,
        success: json?.success,
        backendRegistered: json?.backendRegistered,
      });
      return { success: false, error: "registration-failed" };
    }
    localStorage.removeItem(PENDING_KEY(userId));
    return { success: true, token: pending.token };
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.retry-pending",
      userId,
      message: normalized.message,
      stack: normalized.stack,
    });
    return { success: false, reason: "retry-unavailable" };
  }
}

export function hasPendingToken(userId: string) {
  try {
    if (!userId || typeof window === "undefined") return false;
    if (!safeStorageAvailable("localStorage")) return false;
    return Boolean(localStorage.getItem(PENDING_KEY(userId)));
  } catch {
    return false;
  }
}

export function getCachedRegisteredToken(userId: string): { token: string; deviceId?: string; ts?: number } | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(REGISTERED_KEY(userId)) || "null");
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export async function unregisterFcmToken({ userId }: { userId?: string | null }) {
  try {
    if (!userId) return { success: false, skipped: true, reason: "no-user" };
    const cached = getCachedRegisteredToken(userId);
    const token = cached?.token || (await getFcmToken());
    if (!token) return { success: false, skipped: true, reason: "no-token" };
    const res = await fetch("/api/notifications/unregister-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token }),
    });
    try {
      if (safeStorageAvailable("localStorage")) {
        localStorage.removeItem(REGISTERED_KEY(userId));
        localStorage.removeItem(PENDING_KEY(userId));
      }
    } catch {}
    return { success: res.ok };
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.unregister",
      userId,
      message: normalized.message,
      stack: normalized.stack,
    });
    return { success: false, skipped: true, reason: "unregister-unavailable" };
  }
}

export async function ensureFcmToken(options: { userId?: string | null; forceRefresh?: boolean } = {}) {
  if (!options.userId) return { success: false, skipped: true, reason: "no-user" };
  return autoRegisterFcmToken(options.userId, { forceRefresh: options.forceRefresh });
}

export async function registerFcmToken(options: { userId?: string | null; forceRefresh?: boolean } = {}) {
  return ensureFcmToken(options);
}

export async function listenForegroundMessages(handler: (payload: MessagePayload) => void) {
  try {
    return await onForegroundMessage(handler);
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "fcm.foreground-listener",
      message: normalized.message,
      stack: normalized.stack,
    });
    return () => undefined;
  }
}

export function getDeviceNotificationsPaused() {
  try {
    if (typeof window === "undefined" || !safeStorageAvailable("localStorage")) return false;
    return localStorage.getItem("device-notifications-paused") === "1";
  } catch {
    return false;
  }
}

export async function setDeviceNotificationsPaused(paused: boolean) {
  if (typeof window !== "undefined") {
    try {
      if (safeStorageAvailable("localStorage")) {
        localStorage.setItem("device-notifications-paused", paused ? "1" : "0");
      }
    } catch {}
  }
}
