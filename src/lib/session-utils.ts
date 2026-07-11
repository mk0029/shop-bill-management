"use client";

const SESSION_ID_KEY = "app-session-id";

export function generateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function storeSessionId(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch {}
}

export function getStoredSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SESSION_ID_KEY) || "";
  } catch {
    return "";
  }
}

export function clearStoredSessionId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch {}
}

export type LogoutInfo = {
  reason: "MANUAL" | "DEVICE_LIMIT_EXCEEDED" | "LOGGED_IN_ON_ANOTHER_DEVICE";
  loggedInOn?: string;
  message?: string;
  timestamp?: string;
};
