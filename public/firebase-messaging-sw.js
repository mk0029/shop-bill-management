/* eslint-env serviceworker */
// Delegation stub: keep backward compatibility with any code
// registering '/firebase-messaging-sw.js' by loading the merged
// service worker implementation from '/sw.js'.
// Note: '/sw.js' now contains both offline caching and FCM logic.
try {
  importScripts('/sw.js');
} catch {}
