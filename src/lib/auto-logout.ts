"use client";

export type LogoutReason = "MANUAL" | "DEVICE_LIMIT_EXCEEDED" | "LOGGED_IN_ON_ANOTHER_DEVICE";

export const AUTO_LOGOUT_STORAGE_KEY = "auto-logout-info";

export type AutoLogoutInfo = {
  reason: LogoutReason;
  loggedInOn?: string;
  message?: string;
  at: string;
};

export function setAutoLogoutInfo(info: Omit<AutoLogoutInfo, "at">) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTO_LOGOUT_STORAGE_KEY, JSON.stringify({ ...info, at: new Date().toISOString() }));
}

export function getAutoLogoutInfo(): AutoLogoutInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AUTO_LOGOUT_STORAGE_KEY) || "null");
    return parsed?.reason ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAutoLogoutInfo() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTO_LOGOUT_STORAGE_KEY);
}
