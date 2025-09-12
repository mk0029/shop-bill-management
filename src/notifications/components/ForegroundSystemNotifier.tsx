'use client'

// Intentionally disabled to avoid duplicate system notifications.
// The Service Worker at /sw.js renders OS-level notifications for both
// background and foreground (via postMessage from fcm-client when needed).
// Keeping this component as a no-op ensures only one source shows the OS toast.
export default function ForegroundSystemNotifier() {
  return null
}
