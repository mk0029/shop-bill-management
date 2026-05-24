// Firebase client initialization and helpers for FCM in Next.js (client-side only)
'use client'
import { initializeApp, type FirebaseApp, getApps } from 'firebase/app'
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging'

// IMPORTANT: Use the same config as the service worker (public/firebase-messaging-sw.js)
// to ensure background notifications work (token must belong to the same Firebase project)
const firebaseConfig = {
  apiKey: 'AIzaSyDBKDVUSmcf7qoUrDzQk1FuziGtEo_xuIc',
  authDomain: 'web-push-shop.firebaseapp.com',
  projectId: 'web-push-shop',
  storageBucket: 'web-push-shop.firebasestorage.app',
  messagingSenderId: '1042124125046',
  appId: '1:1042124125046:web:07b684acf519982872c057',
  measurementId: 'G-BZNQMF61R2',
}

let app: FirebaseApp | null = null

export function getClientApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (app) return app
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]!
  }
  return app
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  try {
    const supported = await isSupported()
    if (!supported) return null
    const clientApp = getClientApp()
    if (!clientApp) return null
    return getMessaging(clientApp)
  } catch {
    return null
  }
}

export async function isMessagingAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    return await isSupported()
  } catch {
    return false
  }
}

export async function getFcmToken(opts?: { forceRefresh?: boolean }): Promise<string | null> {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return null
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY')
    return null
  }
  try {
    // Prefer the dedicated Firebase Messaging SW to avoid scope conflicts
    let swReg: ServiceWorkerRegistration | undefined
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || undefined
      } catch {}
    }
    if (opts?.forceRefresh) {
      try {
        await deleteToken(messaging)
      } catch {}
    }
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg || (await navigator.serviceWorker.ready),
    })
    return token || null
  } catch (err) {
    console.warn('Failed to get FCM token', err)
    return null
  }
}

export function onForegroundMessage(
  handler: Parameters<typeof onMessage>[1]
): () => void {
  let unsub = () => {}
  ;(async () => {
    const messaging = await getMessagingIfSupported()
    if (!messaging) return
    unsub = onMessage(messaging, handler)
  })()
  return () => unsub()
}
