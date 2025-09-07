// Firebase Messaging (compat) for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

/* Simple PWA service worker with offline fallback */
const SW_VERSION = 'v1-' + (self && Date.now());
const STATIC_CACHE = `static-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;
// const OFFLINE_URL = '/offline'; // reserved for future use

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

// Broadcast channel to inform clients about notifications received/shown
let bc = null;
try {
  bc = new BroadcastChannel('app-notifications');
} catch {}

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
        } catch {
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

  // --- Helpers to structure meta and route from payload.data ---
  function toStringQuery(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === null || typeof v === 'undefined') continue;
      out[k] = String(v);
    }
    return out;
  }

  function buildRouteFromPayload(data) {
    try {
      const pathname = data.route_path || data.pathname || null;
      let query = {};
      if (data.route_query) {
        try { query = JSON.parse(data.route_query); } catch {}
      }
      // If a link is provided, extract path and query as fallback
      if (!pathname && data.link) {
        try {
          const u = new URL(data.link, self.location.origin);
          const q = {};
          for (const [k, v] of u.searchParams.entries()) q[k] = v;
          return { pathname: u.pathname, query: q };
        } catch {}
      }
      if (!pathname) return null;
      const q2 = toStringQuery(query);
      // Append userId to query if present
      if (data.userId && !q2.userId) q2.userId = String(data.userId);
      return { pathname, query: q2 };
    } catch {
      return null;
    }
  }

  function buildLinkFromRoute(route) {
    if (!route || !route.pathname) return '/';
    const usp = new URLSearchParams(toStringQuery(route.query));
    const qs = usp.toString();
    return qs ? `${route.pathname}?${qs}` : route.pathname;
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

  // ----- Deduping & Aggregation helpers -----
  const AGG_WINDOW_MS = 800; // merge multiple related notifications in this window
  const pendingAgg = new Map(); // key -> { count, timer, lastPayload }

  function computeTag(payload) {
    try {
      const d = (payload && payload.data) || {};
      const n = (payload && payload.notification) || {};
      const wp = (payload && payload.webpush && payload.webpush.notification) || {};
      // Explicit incoming tag wins
      const explicit = wp.tag || d.tag || undefined;
      if (explicit) return explicit;
      // Bill-specific
      if (d.billId) return `bill-${d.billId}`;
      // Inventory grouping by category/product if available
      if (d.event === 'inventory-updated') {
        if (d.categoryId) return `inv-cat-${d.categoryId}`;
        if (d.productId) return `inv-prod-${d.productId}`;
        return 'inv-bulk';
      }
      // Admin broadcast fallbacks by event
      if (d.event) return `evt-${d.event}`;
      // Fallback to title-based tag to prevent duplicates
      return `title-${(n.title || d.title || 'app').slice(0, 32)}`;
    } catch {
      return 'app-notification';
    }
  }

  function maybeAggregateAndShow(payload) {
    const d = (payload && payload.data) || {};
    const key = computeTag(payload);
    // Only aggregate bursts for inventory updates; others replace immediately
    const shouldAggregate = d && d.event === 'inventory-updated';
    if (!shouldAggregate) {
      // Replace existing with same tag (avoid duplicates) and show latest
      return (async () => {
        try {
          const existing = await self.registration.getNotifications({ tag: key });
          if (existing && existing.length) existing.forEach((n) => n.close());
        } catch {}
        // Ensure tag is set for replacement behavior
        payload.webpush = payload.webpush || {};
        payload.webpush.notification = payload.webpush.notification || {};
        payload.webpush.notification.tag = key;
        await showNotificationWithRetry(payload, 3);
      })();
    }

    // Aggregate inventory updates within window
    const prev = pendingAgg.get(key);
    if (prev) {
      clearTimeout(prev.timer);
      const next = { count: prev.count + 1, lastPayload: payload, timer: null };
      next.timer = setTimeout(async () => {
        pendingAgg.delete(key);
        const last = next.lastPayload;
        const d2 = (last && last.data) || {};
        const consolidated = {
          notification: { title: 'Inventory updated', body: `${next.count} change${next.count > 1 ? 's' : ''} just now` },
          data: { ...d2, event: 'inventory-updated', count: String(next.count) },
          webpush: { notification: { tag: key, renotify: true, requireInteraction: true } },
        };
        // Close any existing with same tag, then show consolidated
        try {
          const existing = await self.registration.getNotifications({ tag: key });
          if (existing && existing.length) existing.forEach((n) => n.close());
        } catch {}
        await showNotificationWithRetry(consolidated, 3);
      }, AGG_WINDOW_MS);
      pendingAgg.set(key, next);
      return;
    }
    const first = { count: 1, lastPayload: payload, timer: null };
    first.timer = setTimeout(async () => {
      pendingAgg.delete(key);
      // const d1 = (first.lastPayload && first.lastPayload.data) || {};
      // Single event in window: just show with stable tag and replacement semantics
      const single = {
        ...first.lastPayload,
        webpush: { notification: { ...(first.lastPayload.webpush && first.lastPayload.webpush.notification), tag: key } },
      };
      try {
        const existing = await self.registration.getNotifications({ tag: key });
        if (existing && existing.length) existing.forEach((n) => n.close());
      } catch {}
      await showNotificationWithRetry(single, 3);
    }, AGG_WINDOW_MS);
    pendingAgg.set(key, first);
  }

  async function showNotification(payload) {
    if (!(await shouldShowNotification(payload))) return;
    const n = (payload && payload.notification) || {};
    const wp = (payload && payload.webpush && payload.webpush.notification) || {};
    const data = (payload && payload.data) || {};
    const title = n.title || data.title || 'Notification';
    const route = buildRouteFromPayload(data);
    const options = {
      body: n.body || data.body || '',
      icon: data.icon || wp.icon || '/je-192.ico',
      badge: data.badge || wp.badge || '/je-192.ico',
      image: data.image || wp.image,
      vibrate: wp.vibrate || [100, 50, 100],
      tag: wp.tag || data.tag || computeTag(payload),
      renotify: (wp.renotify ?? true),
      requireInteraction: (wp.requireInteraction ?? true),
      // Show the primary action only for bill-related notifications
      actions: (() => {
        const billId = data.billId;
        if (billId) {
          return [{ action: 'view-bill', title: 'View Bill' }];
        }
        return [];
      })(),
      silent: false,
      data: {
        ...data,
        // Structured meta for app usage
        meta: {
          userId: data.userId || undefined,
          user: (data.user_name || data.user_email || data.user_phone || data.user_id) ? {
            id: data.user_id || data.userId || undefined,
            name: data.user_name || undefined,
            email: data.user_email || undefined,
            phone: data.user_phone || undefined,
          } : undefined,
          route: route || undefined,
        },
        // Compute link preference: use route if present, else explicit link, else sensible default
        link: (() => {
          if (route) return sanitizeRelativeUrl(buildLinkFromRoute(route));
          const explicit = (payload && payload.webpush && payload.webpush.fcm_options && payload.webpush.fcm_options.link) || data.click_action;
          if (explicit) return sanitizeRelativeUrl(explicit);
          const billId = data.billId;
          const role = (data.role || '').toString();
          const customerId = data.customerId;
          if (billId) {
            if (role === 'admin' && customerId) {
              return sanitizeRelativeUrl(`/admin/customers/${customerId}/bills?open=${billId}`);
            }
            return sanitizeRelativeUrl(`/customers/bills?open=${billId}`);
          }
          return '/';
        })(),
      },
    };
    // Dedupe: close existing with same tag and replace with latest
    try {
      const existing = await self.registration.getNotifications({ tag: options.tag });
      if (existing && existing.length) existing.forEach((n) => n.close());
    } catch {}
    await self.registration.showNotification(title, options);

    // Broadcast to any open clients so they can add to their in-app store
    try {
      if (bc) {
        const appNotification = {
          id: data.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: (data.type || 'system'),
          title,
          body: options.body || '',
          createdAt: new Date().toISOString(),
          read: false,
          meta: options.data && options.data.meta ? options.data.meta : undefined,
        };
        bc.postMessage({ type: 'notification:received', payload: appNotification });
      }
    } catch {}
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
        if (!queued) await maybeAggregateAndShow(payload);
      })());
    }
  });

  // Handle background FCM messages (when app/tab is closed or in background)
  messaging.onBackgroundMessage((payload) => {
    const maybeQueue = async () => {
      const queued = await queueNotification(payload);
      if (!queued) await maybeAggregateAndShow(payload);
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
        if (!queued) await maybeAggregateAndShow(payload);
      })());
      return;
    }

    // Data-only: render via enhanced path with preferences and queue support
    event.waitUntil((async () => {
      const queued = await queueNotification(payload);
      if (!queued) await maybeAggregateAndShow(payload);
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
      const role = (notifData.role || '').toString();
      const customerId = notifData.customerId;
      if (role === 'admin' && customerId) {
        url = sanitizeRelativeUrl(`/admin/customers/${customerId}/bills?open=${notifData.billId}`);
      } else {
        url = sanitizeRelativeUrl(`/customers/bills?open=${notifData.billId}`);
      }
    } else if (notifData.meta && notifData.meta.route) {
      try {
        url = sanitizeRelativeUrl(buildLinkFromRoute(notifData.meta.route));
      } catch {
        url = sanitizeRelativeUrl(notifData.link || '/');
      }
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
