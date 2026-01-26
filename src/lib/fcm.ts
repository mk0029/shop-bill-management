"use client"

import { getFcmToken, onForegroundMessage } from "@/notifications/lib/firebase"
import type { MessagePayload } from "firebase/messaging"

/**
 * Registers the current device's FCM token for the given user in Sanity.
 * - Requests/reads the FCM token
 * - Calls POST /api/notifications/register-token { token, userId }
 */

/** Device-local pause helpers (service worker + localStorage) */
export function getDeviceNotificationsPaused(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('device-notifications-paused') === '1'
  } catch {
    return false
  }
}

export async function setDeviceNotificationsPaused(paused: boolean): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        || await navigator.serviceWorker.ready
      try { reg?.active?.postMessage({ type: 'NOTIFICATIONS_SET_PAUSED', value: !!paused }) } catch {}
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('device-notifications-paused', paused ? '1' : '0')
    }
  } catch {}
}

export async function ensureFcmToken(opts: { userId?: string | null } = {}) {
  const { userId } = opts
  try {
    if (typeof Notification === 'undefined') {
      return { success: false as const, skipped: true as const, reason: 'unsupported' as const }
    }
    if (Notification.permission !== 'granted') {
      return { success: false as const, skipped: true as const, reason: 'not-granted' as const }
    }

    // If token already exists, do nothing
    const existing = await getFcmToken()
    if (existing) {
      return { success: true as const, created: false as const, token: existing }
    }

    // Ensure the dedicated Firebase Messaging SW is registered (best effort)
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {})
      }
    } catch {}

    const token = await getFcmToken()
    if (!token) {
      return { success: false as const, skipped: true as const, reason: 'no-token' as const }
    }

    // Save/register token if we have a user (best effort)
    if (userId) {
      await registerFcmToken({ userId, token }).catch(() => {})
    }

    return { success: true as const, created: true as const, token }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false as const, error: msg }
  }
}

export async function registerFcmToken(opts: { userId?: string | null; token?: string | null } = {}) {
  const { userId, token: providedToken } = opts
  try {
    // Do not attempt to retrieve/register token if notifications are not granted
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return { success: false, skipped: true, reason: "not-granted" }
    }
    const token = providedToken || await getFcmToken()
    if (!token) {
      return { success: false, skipped: true, reason: "no-token" }
    }
    if (!userId) {
      // We may still log token for debugging, but cannot register without a user
      return { success: false, skipped: true, reason: "no-user" }
    }

    // Client-side idempotency guard (handles React StrictMode double-invocation)
    try {
      const key = `fcm-registered:${userId}`
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; ts: number } | null
        if (parsed && parsed.token === token) {
          // Skip if we already registered this token recently (24h)
          const oneDay = 24 * 60 * 60 * 1000
          if (Date.now() - parsed.ts < oneDay) {
            return { success: true, skipped: true, reason: "already-registered-local" }
          }
        }
      }
    } catch {}

    const res = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId }),
    })

    const data: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errMsg = (data as { error?: string } | null)?.error || "request-failed"
      return { success: false, error: errMsg }
    }
    try {
      const key = `fcm-registered:${userId}`
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify({ token, ts: Date.now() }))
      }
    } catch {}
    return { success: true, data }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

/**
 * Subscribe to foreground messages (no-op if messaging unsupported).
 * Returns an unsubscribe function.
 */
export async function listenForegroundMessages(handler: (payload: MessagePayload) => void) {
  return onForegroundMessage(handler)
}

/**
 * Returns the locally cached last registered token for a user (if any).
 */
export function getCachedRegisteredToken(userId: string | null | undefined): string | null {
  if (!userId) return null
  try {
    const key = `fcm-registered:${userId}`
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string } | null
    return (parsed && typeof parsed.token === 'string') ? parsed.token : null
  } catch {
    return null
  }
}

/**
 * Unregister the current device's token for the given user in Sanity.
 * - Uses cached token if available; otherwise attempts to fetch token from FCM.
 * - Calls POST /api/notifications/unregister-token { token, userId }
 * - Clears local cache on success.
 */
export async function unregisterFcmToken(opts: { userId?: string | null } = {}) {
  const { userId } = opts
  try {
    const tokenFromCache = getCachedRegisteredToken(userId ?? null)
    let token = tokenFromCache
    if (!token) {
      // Try to get current token if permission still granted
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const mod = await import('@/notifications/lib/firebase')
          token = await mod.getFcmToken()
        }
      } catch {}
    }
    if (!token || !userId) {
      return { success: false, skipped: true as const, reason: 'no-token-or-user' as const }
    }

    const res = await fetch('/api/notifications/unregister-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    })
    const data: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errMsg = (data as { error?: string } | null)?.error || 'request-failed'
      return { success: false, error: errMsg }
    }
    try {
      const key = `fcm-registered:${userId}`
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch {}
    return { success: true, data }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}
