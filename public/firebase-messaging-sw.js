/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background notifications
// Uses compat builds for straightforward SW usage
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js')

let initialized = false
function ensureInitialized(cfg) {
  if (initialized) return true
  try {
    if (!firebase.apps.length) {
      // Minimal config requirement is messagingSenderId; full config also works
      const initCfg = cfg?.messagingSenderId
        ? { messagingSenderId: cfg.messagingSenderId }
        : cfg || {}
      firebase.initializeApp(initCfg)
    }
    initialized = true
    return true
  } catch (e) {
    return false
  }
}

let messaging = null
function getMessagingSafe() {
  try {
    if (!initialized) return null
    return firebase.messaging()
  } catch (e) {
    return null
  }
}

// Receive config from client after registration
self.addEventListener('message', (event) => {
  const data = event?.data || {}
  if (data?.type === 'INIT_FIREBASE' && data?.config) {
    if (ensureInitialized(data.config)) {
      messaging = getMessagingSafe()
    }
  }
})

// Background notification handler
self.addEventListener('push', () => {
  // no-op: FCM uses onBackgroundMessage when initialized
})

function attachBackgroundHandler() {
  if (!messaging || !messaging.onBackgroundMessage) return
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || 'Notification'
    const options = {
      body: payload?.notification?.body || '',
      icon: '/icons/icon-192x192.png',
      data: payload?.data || {},
      badge: '/icons/icon-96x96.png',
    }
    self.registration.showNotification(title, options)
  })
}

// Attempt to init without config (may still work in some setups)
if (ensureInitialized()) {
  messaging = getMessagingSafe()
  attachBackgroundHandler()
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
