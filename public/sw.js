// Firebase Messaging (compat) for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

/* Simple PWA service worker with offline fallback */
const SW_VERSION = 'v1-' + (self && Date.now());
const STATIC_CACHE = `static-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;
const OFFLINE_URL = '/offline'; // kept for future use, not used for navigations now

// Core assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/favicon.ico',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
      .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Helper: is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Ignore non-http(s) schemes and cross-origin requests (e.g., chrome-extension://)
  const reqUrl = new URL(request.url);
  const isHttp = reqUrl.protocol === 'http:' || reqUrl.protocol === 'https:';
  const isSameOrigin = reqUrl.origin === self.location.origin;
  if (!isHttp || !isSameOrigin) {
    return; // let the browser handle it
  }

  // Network-first for navigations (HTML) with offline fallback to cached page or '/'
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        // Race network against a short timeout to avoid long stalls
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('nav-timeout')), 3000));
        try {
          const response = await Promise.race([fetch(request), timeout]);
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const root = await caches.match('/');
          if (root) return root;
          return new Response('<!doctype html><title>Offline</title><h1>Offline</h1><p>This page is not cached yet. Please reconnect.</p>', { headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
    return;
  }

  // Cache-first for static assets (images, styles, scripts)
  const url = new URL(request.url);
  const isStatic = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|otf)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful same-origin HTTP(S) responses
          if (response && response.ok && (response.type === 'basic' || response.type === 'default')) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------- Firebase Messaging setup ----------------
// Initialize Firebase app inside the Service Worker
try {
  // Guard against double init
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp({
      apiKey: 'AIzaSyDBKDVUSmcf7qoUrDzQk1FuziGtEo_xuIc',
      authDomain: 'web-push-shop.firebaseapp.com',
      projectId: 'web-push-shop',
      storageBucket: 'web-push-shop.firebasestorage.app',
      messagingSenderId: '1042124125046',
      appId: '1:1042124125046:web:07b684acf519982872c057',
      measurementId: 'G-BZNQMF61R2',
    });
  }

  const messaging = firebase.messaging();

  // ---------------- IndexedDB helpers for offline notification queue ----------------
  // Open (or create) a small DB to store queued notifications while offline
  function openDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('pwa-notifications', 1);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('notifications')) {
            db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
          }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function queueNotification(payload) {
    // In SW, navigator may not expose onLine reliably across all browsers.
    // We still honor the instruction: only queue when detected offline.
    const isOnline = (self.navigator && 'onLine' in self.navigator) ? self.navigator.onLine : true;
    if (isOnline) return false;
    try {
      const db = await openDB();
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      await new Promise((resolve, reject) => {
        const req = store.add({ payload, timestamp: Date.now(), retryCount: 0 });
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
      });
      return true;
    } catch {
      // If queueing fails, we fall back to immediate show (handled by caller)
      return false;
    }
  }

  async function getAllQueuedNotifications() {
    const db = await openDB();
    const tx = db.transaction('notifications', 'readonly');
    const store = tx.objectStore('notifications');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  }

  async function deleteQueuedNotification(id) {
    const db = await openDB();
    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  }

  async function incrementRetry(id, current) {
    const db = await openDB();
    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');
    return new Promise((resolve, reject) => {
      const req = store.put({ ...current, id: current.id, retryCount: (current.retryCount || 0) + 1 });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  }

  // Preference check — fall back to showing if endpoint fails
  async function shouldShowNotification(payload) {
    try {
      const resp = await fetch('/api/notifications/preferences', { method: 'GET', credentials: 'include' });
      if (!resp.ok) return true;
      const json = await resp.json();
      const enabled = !!json?.enabled;
      const types = Array.isArray(json?.types) ? json.types : [];
      const pType = (payload && payload.data && payload.data.type) || 'default';
      return enabled && (types.length === 0 || types.includes(pType));
    } catch {
      return true;
    }
  }

  function sanitizeRelativeUrl(url) {
    try {
      const u = new URL(url, self.location.origin);
      // Only allow same-origin navigations
      if (u.origin !== self.location.origin) return '/';
      return u.pathname + u.search + u.hash;
    } catch {
      return '/';
    }
  }

  async function showNotificationWithRetry(payload, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await showNotification(payload);
        return true;
      } catch {
        attempt++;
        if (attempt >= maxRetries) return false;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return false;
  }

  async function showNotification(payload) {
    if (!(await shouldShowNotification(payload))) return;
    const n = (payload && payload.notification) || {};
    const wp = (payload && payload.webpush && payload.webpush.notification) || {};
    const data = (payload && payload.data) || {};
    const title = n.title || data.title || 'Notification';
    const options = {
      body: n.body || data.body || '',
      icon: data.icon || wp.icon || '/je-192.ico',
      badge: data.badge || wp.badge || '/je-192.ico',
      image: data.image || wp.image,
      vibrate: wp.vibrate || [100, 50, 100],
      tag: wp.tag || data.tag || 'app-notification',
      renotify: (wp.renotify ?? true),
      requireInteraction: (wp.requireInteraction ?? true),
      actions: (wp.actions && Array.isArray(wp.actions) ? wp.actions : [
        { action: 'view-bill', title: 'View Bill' },
        { action: 'dismiss', title: 'Dismiss' },
      ]),
      data: {
        ...data,
        link: sanitizeRelativeUrl(((payload && payload.webpush && payload.webpush.fcm_options && payload.webpush.fcm_options.link) || data.click_action || (data.billId ? `/bills/${data.billId}` : '/'))),
      },
    };
    // Dedupe: if a notification with the same tag is already shown, skip
    try {
      const existing = await self.registration.getNotifications({ tag: options.tag });
      if (existing && existing.length > 0) {
        return;
      }
    } catch {}
    await self.registration.showNotification(title, options);
  }

  async function processQueuedNotifications() {
    // Only process when online (best effort)
    const isOnline = (self.navigator && 'onLine' in self.navigator) ? self.navigator.onLine : true;
    if (!isOnline) return;
    try {
      const queued = await getAllQueuedNotifications();
      for (const item of queued) {
        if ((item.retryCount || 0) >= 3) {
          await deleteQueuedNotification(item.id);
          continue;
        }
        const ok = await showNotificationWithRetry(item.payload, 3);
        if (ok) {
          await deleteQueuedNotification(item.id);
        } else {
          await incrementRetry(item.id, item);
        }
      }
    } catch {}
  }

  // Best-effort: process any queued notifications when SW activates
  self.addEventListener('activate', (ev) => {
    ev.waitUntil(processQueuedNotifications());
  });

  // Optional: listen for online events if the environment emits them in SW
  try {
    self.addEventListener('online', () => {
      // Not guaranteed to fire in SW across browsers, but harmless if it does
      processQueuedNotifications();
    });
  } catch {}

  // Also allow pages to poke the SW to process queue
  self.addEventListener('message', (event) => {
    if (event && event.data === 'PROCESS_NOTIFICATION_QUEUE') {
      event.waitUntil(processQueuedNotifications());
      return;
    }
    // From page: request SW to show notification for a foreground message when page is hidden
    // Payload is expected to be a Firebase message payload-like object
    if (event && event.data && event.data.type === 'SHOW_NOTIFICATION') {
      const payload = event.data.payload;
      event.waitUntil((async () => {
        const queued = await queueNotification(payload);
        if (!queued) await showNotificationWithRetry(payload, 3);
      })());
    }
  });

  // Handle background FCM messages (when app/tab is closed or in background)
  messaging.onBackgroundMessage((payload) => {
    const maybeQueue = async () => {
      const queued = await queueNotification(payload);
      if (!queued) {
        await showNotificationWithRetry(payload, 3);
      }
    };
    // Fire-and-forget; onBackgroundMessage has no event to waitUntil
    maybeQueue();
  });

  // Fallback for raw Web Push / data-only FCM messages
  self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try {
      payload = event.data.json();
    } catch {
      return; // Not JSON
    }

    // If a notification block is already present, prefer onBackgroundMessage path in compat
    const hasNotification = !!(payload.notification || (payload.webpush && payload.webpush.notification));
    if (hasNotification) {
      // Route through unified display (with preferences + dedupe)
      event.waitUntil((async () => {
        const queued = await queueNotification(payload);
        if (!queued) await showNotificationWithRetry(payload, 3);
      })());
      return;
    }

    // Data-only: render via enhanced path with preferences and queue support
    event.waitUntil((async () => {
      const queued = await queueNotification(payload);
      if (!queued) await showNotificationWithRetry(payload, 3);
    })());
  });

  // Notification click behavior: handle actions and safe navigation
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const notifData = (event.notification && event.notification.data) || {};
    const action = event.action;
    if (action === 'dismiss') {
      return; // do nothing
    }
    let url = '/';
    if (action === 'view-bill' && notifData.billId) {
      url = sanitizeRelativeUrl(`/bills/${notifData.billId}`);
    } else if (notifData.link) {
      url = sanitizeRelativeUrl(notifData.link);
    }

    event.waitUntil((async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOrigin = allClients.find((c) => 'url' in c && c.url && c.url.startsWith(self.location.origin));
      if (sameOrigin) {
        await sameOrigin.focus();
        try { await sameOrigin.navigate(url); } catch {}
        return;
      }
      await clients.openWindow(url);
    })());
  });
} catch {
  // Swallow Firebase init errors to avoid breaking offline caching
}
