import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, isSupported, Messaging } from 'firebase/messaging'

let messagingPromise: Promise<Messaging | null> | null = null

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  }
}

export function getFirebaseApp() {
  const config = getFirebaseConfig()
  if (!getApps().length) {
    initializeApp(config)
  }
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  if (messagingPromise) return messagingPromise
  messagingPromise = (async () => {
    try {
      const supported = await isSupported()
      if (supported) {
        getFirebaseApp()
        return getMessaging()
      }
      // Diagnostics: check individual capabilities and attempt a best-effort init
      const hasSW = 'serviceWorker' in navigator
      const hasPush = 'PushManager' in window
      const hasNotif = 'Notification' in window
      const hasIDB = 'indexedDB' in window
      try { console.log('[FCM] isSupported=false', { hasSW, hasPush, hasNotif, hasIDB }) } catch {}
      if (hasSW && hasPush && hasNotif && hasIDB) {
        try {
          getFirebaseApp()
          return getMessaging()
        } catch {
          return null
        }
      }
      return null
    } catch {
      return null
    }
  })()
  return messagingPromise
}
