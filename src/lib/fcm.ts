"use client"

import { getFcmToken, onForegroundMessage } from "@/notifications/lib/firebase"
import type { MessagePayload } from "firebase/messaging"

/**
 * Registers the current device's FCM token for the given user in Sanity.
 * - Requests/reads the FCM token
 * - Calls POST /api/notifications/register-token { token, userId }
 */
export async function registerFcmToken(opts: { userId?: string | null } = {}) {
  const { userId } = opts
  try {
    // Do not attempt to retrieve/register token if notifications are not granted
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return { success: false, skipped: true, reason: "not-granted" }
    }
    const token = await getFcmToken()
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
