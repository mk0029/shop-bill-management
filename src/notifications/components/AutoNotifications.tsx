'use client'

import { useEffect } from 'react'
import { useAuthStore } from '../../store/auth-store'
import { useNotificationStore } from '../../store/notification-store'
import { getClientApp, getFcmToken, isMessagingAvailable } from '../lib/firebase'
import { registerFcmToken } from '../../lib/fcm'


/**
 * AutoNotifications
 * - Registers FCM service worker
 * - Requests Notification permission (if default)
 * - Logs the user's FCM token to the console
 *
 * This component renders nothing and should be mounted once globally (e.g., in RootLayout).
 */
export default function AutoNotifications() {
  const user = useAuthStore((s) => s.user)
  const unread = useNotificationStore((s) => s.unread)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (typeof window === 'undefined') return

      // 1) Register the Firebase Messaging Service Worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js')
          // Clean up legacy/duplicate workers that can cause double notifications
          try {
            const regs = await navigator.serviceWorker.getRegistrations()
            for (const reg of regs) {
              const scope = reg.scope || ''
              // Remove the legacy default FCM scope created by older SDKs
              if (scope.includes('/firebase-cloud-messaging-push-scope')) {
                await reg.unregister().catch(() => {})
              }
            }
          } catch {}
        } catch (err) {
          console.warn('[FCM] SW registration failed (continuing without background notifications)', err)
        }
      }

      // 2) Check FCM support
      const supported = await isMessagingAvailable()
      if (!supported) {
        console.info('[FCM] Messaging not supported in this browser/context')
        return
      }

      // 3) Initialize Firebase app (client)
      getClientApp()

      // 4) Request notification permission if needed
      // DO NOT request permission automatically. Respect user's choice and only act if already granted.
      // Native OS/browser prompt will appear when user explicitly interacts with a feature that needs it.

      if (cancelled) return

      // 5) Get FCM token and register to backend for this user (only if permission already granted)
      const token = (typeof Notification !== 'undefined' && Notification.permission === 'granted')
        ? await getFcmToken()
        : null
      if (token) {
        // Attempt to register if we have a logged-in user
        const userId = user?.id ?? null
        if (userId) {
          try {
            const res = await registerFcmToken({ userId })
            if (!('success' in res) || !res.success) {
              console.warn('[FCM] Registration failed/skipped', res)
            }
          } catch (e) {
            console.warn('[FCM] Registration error', e)
          }
        }
      } else {
        console.warn('[FCM] No token (permission denied, missing VAPID key, or SW not ready)')
      }
    }

    init()

    // Re-register token when we come back online
    function handleOnline() {
      if (!user?.id) return
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        registerFcmToken({ userId: user.id }).catch(() => {})
      }
    }

    // Also attempt when tab becomes visible (user came back)
    function handleVisibility() {
      if (document.visibilityState === 'visible' && user?.id) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          registerFcmToken({ userId: user.id }).catch(() => {})
        }
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])

  // Keep PWA app badge in sync with unread count (supported on Chromium and some platforms)
  useEffect(() => {
    try {
      const n = Number(unread) || 0
      if (n > 0 && navigator.setAppBadge) {
        navigator.setAppBadge(n).catch(() => {})
      } else if (n === 0) {
        navigator.clearAppBadge?.()
      }
    } catch {}
  }, [unread])

  return null
}
