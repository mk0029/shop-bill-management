/*
  Client-side Firebase Cloud Messaging (FCM) utilities
  - Requests notification permission
  - Retrieves FCM token with VAPID and registers it to backend
  - Handles token refresh and foreground messages
  - Designed to work with service worker at /sw.js (compat mode)
*/

import firebase from 'firebase/compat/app'
import 'firebase/compat/messaging'

// Keep this in sync with public/sw.js config
const firebaseConfig = {
  apiKey: 'AIzaSyDBKDVUSmcf7qoUrDzQk1FuziGtEo_xuIc',
  authDomain: 'web-push-shop.firebaseapp.com',
  projectId: 'web-push-shop',
  storageBucket: 'web-push-shop.firebasestorage.app',
  messagingSenderId: '1042124125046',
  appId: '1:1042124125046:web:07b684acf519982872c057',
  measurementId: 'G-BZNQMF61R2',
}

let messaging: firebase.messaging.Messaging | null = null

function ensureFirebase(): firebase.app.App {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
  }
  if (!messaging) {
    try {
      messaging = firebase.messaging()
    } catch {
      // In some environments without Notification support, messaging init may fail
      messaging = null
    }
  }
  return firebase.app()
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!('serviceWorker' in navigator)) return null
    // Ensure our main SW is ready (registered by the app shell)
    const reg = await navigator.serviceWorker.ready
    return reg
  } catch {
    return null
  }
}

async function getVapidKey(): Promise<string | undefined> {
  // Public VAPID key must be exposed as NEXT_PUBLIC_*
  const key = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  return key || undefined
}

async function getAndRegisterToken(userId: string): Promise<string | null> {
  ensureFirebase()
  if (!messaging) return null
  try {
    const vapidKey = await getVapidKey()
    const swReg = await getSWRegistration()
    const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: swReg || undefined })
    if (token) {
      await registerToken(token, userId)
      return token
    }
    return null
  } catch (error) {
    // Common reasons: permission not granted, unsupported browser, SW scope issues
    console.error('[FCM] getToken error', error)
    return null
  }
}

async function registerToken(token: string, userId: string): Promise<void> {
  try {
    await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
      credentials: 'include',
    })
  } catch (e) {
    console.error('[FCM] register-token failed', e)
  }
}

export async function requestNotificationPermissionAndGetToken(userId: string): Promise<string | null> {
  try {
    // Request permission if not already granted
    if (typeof Notification === 'undefined') return null
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') return null

    // Now attempt to get the token and register
    return await getAndRegisterToken(userId)
  } catch (error) {
    console.error('[FCM] permission/token error', error)
    return null
  }
}

export function listenForegroundMessages(): void {
  ensureFirebase()
  if (!messaging) return
  try {
    messaging.onMessage((payload: firebase.messaging.MessagePayload) => {
      // If page is not visible (minimized or tab not active), ask SW to show a system notification
      const notVisible = typeof document !== 'undefined' && document.visibilityState !== 'visible'
      if (notVisible) {
        getSWRegistration()
          .then((reg) => {
            try {
              reg?.active?.postMessage({ type: 'SHOW_NOTIFICATION', payload })
            } catch {
              // Fallback to page Notification if SW messaging fails
              showPageNotification(payload)
            }
          })
          .catch(() => showPageNotification(payload))
        return
      }
      // Page visible: do not spawn OS notification from here.
      // Let the app's in-app notification center/toasts handle foreground messages.
    })
  } catch (e) {
    console.error('[FCM] onMessage setup error', e)
  }
}

function showPageNotification(payload: firebase.messaging.MessagePayload) {
  try {
    const n = payload?.notification
    const data = (payload?.data as Record<string, string> | undefined) || {}
    const title = n?.title || data.title || 'Notification'
    const body = n?.body || data.body || ''
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: data.icon || '/je-192.ico',
        badge: data.badge || '/je-192.ico',
      })
    }
  } catch (err) {
    console.error('[FCM] foreground notification error', err)
  }
}

export function listenTokenRefresh(userIdProvider: () => string | null | undefined): void {
  ensureFirebase()
  if (!messaging) return

  // In compat, onTokenRefresh exists in v8; in newer browsers, token may rotate without event.
  // We guard the call and also add a visibility-based refresh attempt.
  const maybeRefresh = messaging as unknown as { onTokenRefresh?: (handler: () => void) => void }
  if (maybeRefresh && typeof maybeRefresh.onTokenRefresh === 'function') {
    try {
      maybeRefresh.onTokenRefresh!(async () => {
        const uid = userIdProvider()
        if (!uid) return
        await getAndRegisterToken(uid)
      })
    } catch {}
  }

  // Fallback: on app visibility change, try to refresh token occasionally
  let lastRefresh = 0
  const REFRESH_INTERVAL = 1000 * 60 * 60 // 1 hour
  const onVis = async () => {
    try {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRefresh < REFRESH_INTERVAL) return
      lastRefresh = now
      const uid = userIdProvider()
      if (!uid) return
      await getAndRegisterToken(uid)
    } catch {}
  }
  try {
    document.addEventListener('visibilitychange', onVis)
  } catch {}
}

// Convenience initializer to be called after auth is ready
export function initFCM(userIdProvider: () => string | null | undefined): void {
  ensureFirebase()
  // Install listeners and attempt token if permission already granted
  listenForegroundMessages()
  listenTokenRefresh(userIdProvider)
}

/*
Usage example (React):

import { useEffect } from 'react'
import { initFCM, requestNotificationPermissionAndGetToken } from '@/lib/fcm-client'
import { useAuth } from '@clerk/nextjs' // or your auth provider

export function FCMInitializer() {
  const { userId } = useAuth()
  useEffect(() => {
    initFCM(() => userId || null)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    // Optionally prompt for permission on a user action (e.g., button click) instead of mount
    requestNotificationPermissionAndGetToken(userId)
  }, [userId])

  return null
}
*/
