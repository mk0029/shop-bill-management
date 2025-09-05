/* eslint-env serviceworker */
// Firebase Messaging Service Worker
// Uses compat SDK for service worker support
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDBKDVUSmcf7qoUrDzQk1FuziGtEo_xuIc',
  authDomain: 'web-push-shop.firebaseapp.com',
  projectId: 'web-push-shop',
  storageBucket: 'web-push-shop.firebasestorage.app',
  messagingSenderId: '1042124125046',
  appId: '1:1042124125046:web:07b684acf519982872c057',
  measurementId: 'G-BZNQMF61R2',
});

const messaging = firebase.messaging();

// Ensure the newest SW takes control ASAP
self.skipWaiting();
self.clients.claim();

// Handle background messages (tab closed, app in background, or PWA closed)
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const wp = (payload.webpush && payload.webpush.notification) || {};
  const data = payload.data || {};

  const title = n.title || 'Notification';
  const options = {
    body: n.body || '',
    icon: wp.icon || '/je-192.ico',
    badge: wp.badge || '/je-192.ico',
    image: wp.image,
    vibrate: wp.vibrate || [100, 50, 100],
    tag: wp.tag || data.tag,
    renotify: wp.renotify ?? true,
    requireInteraction: wp.requireInteraction ?? false,
    actions: wp.actions || [],
    data: {
      ...data,
      link: (payload.webpush && payload.webpush.fcm_options && payload.webpush.fcm_options.link) || data.click_action || '/',
    },
  };

  self.registration.showNotification(title, options);
});

// Fallback for raw Web Push / data-only FCM messages
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    // If not JSON, ignore (or show a minimal notification if desired)
    return;
  }

  // Avoid double notifications: if payload has a notification block,
  // Firebase Messaging SDK will already handle it via onBackgroundMessage.
  const hasNotification = !!(payload.notification || (payload.webpush && payload.webpush.notification));
  if (hasNotification) return;

  const data = payload.data || {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/je-192.ico',
    badge: data.badge || '/je-192.ico',
    image: data.image,
    vibrate: [100, 50, 100],
    tag: data.tag,
    renotify: true,
    requireInteraction: false,
    actions: data.actions ? JSON.parse(data.actions) : [],
    data: {
      ...data,
      link: (payload.webpush && payload.webpush.fcm_options && payload.webpush.fcm_options.link) || data.click_action || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.link) || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Try to focus an existing client from this origin
    const sameOrigin = allClients.find((c) => 'url' in c && c.url && c.url.startsWith(self.location.origin));
    if (sameOrigin) {
      await sameOrigin.focus();
      try { await sameOrigin.navigate(url); } catch {}
      return;
    }
    await clients.openWindow(url);
  })());
});
