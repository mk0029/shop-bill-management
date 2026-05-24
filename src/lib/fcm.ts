"use client"

import { getFcmToken, onForegroundMessage } from "@/notifications/lib/firebase"
import type { MessagePayload } from "firebase/messaging"
import { getDeviceId, getPlatformInfo } from "./device-id"

// Local keys
const PENDING_TOKEN_KEY = (userId: string) => `fcm-pending-token:${userId}`
const REGISTERED_KEY = (userId: string) => `fcm-registered:${userId}`
const REGISTERING_KEY = (userId: string) => `fcm-registering:${userId}`
const FCM_TOKEN_MAX_AGE_DAYS = 30
const FCM_TOKEN_MAX_AGE_MS = FCM_TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

/**
 * Background auto-registration: generates token, silently saves to backend.
 * If backend save fails, stores token locally as pending for retry UI.
 * Prevents duplicate concurrent registrations using a transient flag.
 */
export async function autoRegisterFcmToken(userId: string, opts: { forceRefresh?: boolean } = {}) {
  if (!userId || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return { success: false, skipped: true, reason: 'not-granted-or-no-user' };
  }
  // Prevent duplicate concurrent registrations
  const registeringKey = REGISTERING_KEY(userId);
  try {
    const registering = localStorage.getItem(registeringKey);
    if (registering) {
      const ts = parseInt(registering, 10);
      // If another registration started within the last 10 seconds, skip
      for (let attempt = 0; attempt < 3; attempt++) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff
        await timeout(delay);
        if (Date.now() - ts < 10000) {
          return { success: false, skipped: true, reason: 'already-registering' };
        }
      }
    }
    localStorage.setItem(registeringKey, String(Date.now()));
  } catch {}

  try {
    const cached = getCachedRegisteredToken(userId);
    const shouldForceRefresh = !!opts.forceRefresh;
    const isOldToken = !!(cached?.ts && Date.now() - cached.ts > FCM_TOKEN_MAX_AGE_MS);

    if ((isOldToken || shouldForceRefresh) && cached?.token) {
      // Best-effort remove stale token from backend before rotating.
      try {
        await fetch('/api/notifications/unregister-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: cached.token, userId }),
        });
      } catch {}
      try {
        localStorage.removeItem(REGISTERED_KEY(userId));
      } catch {}
    }

    const token =
      (!isOldToken && !shouldForceRefresh ? cached?.token : null) ||
      (await getFcmToken({ forceRefresh: shouldForceRefresh }).catch((e) => {
        console.error("[FCM] Token retrieval failed", e);
        return null;
      }));
    const finalToken =
      token ||
      (await getFcmToken({ forceRefresh: true }).catch((e) => {
        console.error("[FCM] Force refresh token retrieval failed", e);
        return null;
      }));
    if (!finalToken) {
      console.warn('[FCM] No token from Firebase');
      return { success: false, skipped: true, reason: 'no-token' };
    }
    const deviceId = getDeviceId();
    const platform = getPlatformInfo();
    // Backend expects token as string; ignore deviceId/platform for now
    const payload = { token: finalToken, userId };
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[FCM] Backend registration failed', data);
      // Store pending token for retry UI (include deviceId/platform for future use)
      try {
        localStorage.setItem(PENDING_TOKEN_KEY(userId), JSON.stringify({ token: finalToken, deviceId, platform, ts: Date.now() }));
      } catch {}
      return { success: false, error: data?.error || 'request-failed', pending: true };
    }
    // Success: clear any pending flag and mark registered (store token only for now)
    try {
      localStorage.removeItem(PENDING_TOKEN_KEY(userId));
      localStorage.setItem(REGISTERED_KEY(userId), JSON.stringify({ token: finalToken, deviceId, ts: Date.now() }));
    } catch {}
    return { success: true, token: finalToken, deviceId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    // Clear the registering flag
    try {
      localStorage.removeItem(registeringKey);
    } catch {}
  }
}

/**
 * Retry registration for a pending token (called from retry popup).
 */
export async function retryPendingFcmToken(userId: string) {
  if (!userId) return { success: false, reason: 'no-user' };
  try {
    const pendingRaw = localStorage.getItem(PENDING_TOKEN_KEY(userId));
    if (!pendingRaw) return { success: false, reason: 'no-pending' };
    const pending = JSON.parse(pendingRaw) as { token: string; deviceId: string; platform: any; ts?: number };
    // Backend expects token as string only
    const payload = { token: pending.token, userId };
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[FCM] Retry registration failed', data);
      return { success: false, error: data?.error || 'request-failed' };
    }
    // Success: clear pending and mark registered (store token only for now)
    try {
      localStorage.removeItem(PENDING_TOKEN_KEY(userId));
      localStorage.setItem(REGISTERED_KEY(userId), JSON.stringify({ token: pending.token, deviceId: pending.deviceId, ts: Date.now() }));
    } catch {}
    return { success: true, token: pending.token, deviceId: pending.deviceId };
  } catch (e) {
    console.error('[FCM] Retry exception', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Check if there is a pending token for the given user.
 */
export function hasPendingToken(userId: string): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(PENDING_TOKEN_KEY(userId));
  } catch {
    return false;
  }
}

/**
 * Get the locally cached registered token for a user (if any).
 */
export function getCachedRegisteredToken(userId: string): { token: string; deviceId: string; ts?: number } | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REGISTERED_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; deviceId?: string; ts?: number } | null;
    return (parsed && typeof parsed.token === 'string' && typeof parsed.deviceId === 'string')
      ? { token: parsed.token, deviceId: parsed.deviceId, ts: typeof parsed.ts === 'number' ? parsed.ts : undefined }
      : null;
  } catch {
    return null;
  }
}

/**
 * Legacy ensureFcmToken: wraps auto-register for compatibility.
 */
export async function ensureFcmToken(opts: { userId?: string | null; forceRefresh?: boolean } = {}) {
  const { userId, forceRefresh } = opts;
  if (!userId) return { success: false, skipped: true, reason: 'no-user' };
  return autoRegisterFcmToken(userId, { forceRefresh });
}

/**
 * Legacy registerFcmToken: now just forwards to auto-register.
 */
export async function registerFcmToken(opts: { userId?: string | null; token?: string | null; forceRefresh?: boolean } = {}) {
  const { userId, forceRefresh } = opts;
  if (!userId) return { success: false, skipped: true, reason: 'no-user' };
  return autoRegisterFcmToken(userId, { forceRefresh });
}

/**
 * Unregister the current device's token for the given user.
 */
export async function unregisterFcmToken(opts: { userId?: string | null } = {}) {
  const { userId } = opts;
  if (!userId) return { success: false, skipped: true, reason: 'no-user' };
  try {
    const cached = getCachedRegisteredToken(userId);
    const token = cached?.token || await getFcmToken();
    const deviceId = cached?.deviceId || getDeviceId();
    if (!token) return { success: false, skipped: true, reason: 'no-token' };
    // Backend expects token as string only
    const res = await fetch('/api/notifications/unregister-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = (data as { error?: string } | null)?.error || 'request-failed';
      return { success: false, error: errMsg };
    }
    // Clear local caches
    try {
      localStorage.removeItem(PENDING_TOKEN_KEY(userId));
      localStorage.removeItem(REGISTERED_KEY(userId));
    } catch {}
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Device pause helpers (unchanged) */
export function getDeviceNotificationsPaused(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('device-notifications-paused') === '1';
  } catch {
    return false;
  }
}

export async function setDeviceNotificationsPaused(paused: boolean): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        || await navigator.serviceWorker.ready;
      try { reg?.active?.postMessage({ type: 'NOTIFICATIONS_SET_PAUSED', value: !!paused }); } catch {}
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('device-notifications-paused', paused ? '1' : '0');
    }
  } catch {}
}

/**
 * Subscribe to foreground messages.
 */
export async function listenForegroundMessages(handler: (payload: MessagePayload) => void) {
  return onForegroundMessage(handler);
}
function timeout(delay: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}
