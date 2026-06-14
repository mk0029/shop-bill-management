"use client";

import type { MessagePayload } from "firebase/messaging";
import { getFcmToken, onForegroundMessage, ensureMessagingServiceWorker } from "@/lib/firebase/messaging";
import { getDeviceInfo } from "./device";

const REGISTERED_KEY = (userId: string) => `fcm-registered:${userId}`;
const PENDING_KEY = (userId: string) => `fcm-pending-token:${userId}`;

type RegisterResult = {
  success: boolean;
  token?: string;
  deviceId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
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
  if (!userId || typeof window === "undefined") return { success: false, skipped: true, reason: "no-user" };
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return { success: false, skipped: true, reason: "permission-not-granted" };
  }

  await ensureMessagingServiceWorker().catch(() => undefined);
  const token = await getFcmToken({ forceRefresh: options.forceRefresh });
  if (!token) return { success: false, skipped: true, reason: "no-token" };

  const deviceInfo = getDeviceInfo();
  const cached = getCachedRegisteredToken(userId);
  if (
    !options.forceRefresh &&
    cached?.token === token &&
    cached.deviceId === deviceInfo.deviceId
  ) {
    return { success: true, token, deviceId: deviceInfo.deviceId, skipped: true, reason: "already-registered" };
  }

  const status = await fetch("/api/notifications/device-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, deviceId: deviceInfo.deviceId }),
  })
    .then((res) => res.json())
    .catch(() => null);
  if (status?.success && status?.known !== false && status?.active === false) {
    return { success: false, skipped: true, reason: "device-inactive" };
  }

  const res = await fetch("/api/notifications/register-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token, deviceInfo }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.success) {
    try {
      localStorage.setItem(PENDING_KEY(userId), JSON.stringify({ token, deviceInfo, ts: Date.now() }));
    } catch {}
    return { success: false, error: json?.error || "registration-failed" };
  }

  try {
    localStorage.removeItem(PENDING_KEY(userId));
    localStorage.setItem(REGISTERED_KEY(userId), JSON.stringify({ token, deviceId: deviceInfo.deviceId, ts: Date.now() }));
  } catch {}

  return { success: true, token, deviceId: deviceInfo.deviceId };
}

export async function registerDeviceSession(userId: string): Promise<RegisterResult> {
  if (!userId || typeof window === "undefined") return { success: false, skipped: true, reason: "no-user" };
  const deviceInfo = getDeviceInfo();
  if (!deviceInfo.deviceId) return { success: false, skipped: true, reason: "no-device" };

  const res = await fetch("/api/notifications/register-device", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, deviceInfo }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    return { success: false, error: json?.error || "device-registration-failed" };
  }
  const status = await fetch("/api/notifications/device-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, deviceId: deviceInfo.deviceId }),
  })
    .then((response) => response.json())
    .catch(() => null);
  if (status?.success && status?.known !== false && status?.active === false) {
    return { success: false, error: "device-inactive" };
  }
  return { success: true, deviceId: deviceInfo.deviceId };
}

export async function retryPendingFcmToken(userId: string) {
  if (!userId || typeof window === "undefined") return { success: false, reason: "no-user" };
  const raw = localStorage.getItem(PENDING_KEY(userId));
  if (!raw) return { success: false, reason: "no-pending" };
  const pending = JSON.parse(raw) as { token?: string; deviceInfo?: unknown };
  if (!pending.token) return { success: false, reason: "no-token" };
  const res = await fetch("/api/notifications/register-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token: pending.token, deviceInfo: pending.deviceInfo || getDeviceInfo() }),
  });
  if (!res.ok) return { success: false, error: "registration-failed" };
  localStorage.removeItem(PENDING_KEY(userId));
  return { success: true, token: pending.token };
}

export function hasPendingToken(userId: string) {
  if (!userId || typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PENDING_KEY(userId)));
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
    localStorage.removeItem(REGISTERED_KEY(userId));
    localStorage.removeItem(PENDING_KEY(userId));
  } catch {}
  return { success: res.ok };
}

export async function ensureFcmToken(options: { userId?: string | null; forceRefresh?: boolean } = {}) {
  if (!options.userId) return { success: false, skipped: true, reason: "no-user" };
  return autoRegisterFcmToken(options.userId, { forceRefresh: options.forceRefresh });
}

export async function registerFcmToken(options: { userId?: string | null; forceRefresh?: boolean } = {}) {
  return ensureFcmToken(options);
}

export async function listenForegroundMessages(handler: (payload: MessagePayload) => void) {
  return onForegroundMessage(handler);
}

export function getDeviceNotificationsPaused() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("device-notifications-paused") === "1";
}

export async function setDeviceNotificationsPaused(paused: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem("device-notifications-paused", paused ? "1" : "0");
  }
}
