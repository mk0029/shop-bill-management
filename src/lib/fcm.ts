import { getToken, onMessage } from 'firebase/messaging'
import { getMessagingIfSupported, getFirebaseConfig } from './firebase'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''

export async function registerFcmToken(opts: { userId?: string | null } = {}) {
  if (typeof window === 'undefined') return { skipped: true, reason: 'ssr' }
  try {
    // Always request permission first so the browser shows the native prompt on user gesture
    if (!('Notification' in window)) return { skipped: true, reason: 'notifications-not-supported' }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { skipped: true, reason: 'permission-denied', permissionGranted: false }

    const messaging = await getMessagingIfSupported()
    if (!messaging) {
      const details = {
        secure: typeof window !== 'undefined' ? (window as any).isSecureContext === true : false,
        hasSW: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        hasPush: typeof window !== 'undefined' && 'PushManager' in window,
        hasNotif: typeof window !== 'undefined' && 'Notification' in window,
        hasIDB: typeof window !== 'undefined' && 'indexedDB' in window,
      }
      try { console.warn('[FCM] messaging-not-supported details', details) } catch {}
      // Permission granted but messaging not available; report as pending so UI can inform user
      return { skipped: true, reason: 'messaging-not-supported', details, permissionGranted: true }
    }

    // Ensure service worker is registered
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        // wait until active
        const readyReg = await navigator.serviceWorker.ready
        // send firebase config to SW for compat init
        const cfg = getFirebaseConfig()
        readyReg.active?.postMessage({ type: 'INIT_FIREBASE', config: cfg })
      } catch (e) {
        // continue; foreground messaging can still work
      }
    }

    const swReg = await (async () => {
      try {
        return await navigator.serviceWorker.ready
      } catch {
        return undefined
      }
    })()

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    } as any)
    if (!token) return { skipped: true, reason: 'no-token' }

    // If no userId yet, store locally and return; caller can persist later
    if (!opts.userId) {
      try {
        localStorage.setItem('pending_fcm_token', token)
      } catch {}
      return { ok: true, token, pendingSave: true }
    }

    // Send to API to persist on user
    await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId: opts.userId }),
    })

    return { ok: true, token, permissionGranted: true }
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}

export async function listenForegroundMessages(handler: (payload: any) => void) {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return () => {}
  const unsub = onMessage(messaging, handler)
  return unsub
}
