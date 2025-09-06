'use client'

import { useEffect } from 'react'
import { onForegroundMessage } from '@/notifications/lib/firebase'
import type { MessagePayload } from 'firebase/messaging'

/**
 * ForegroundSystemNotifier
 * - Listens for FCM messages while the page is active
 * - Displays a system-level notification using the Notifications API ONLY when
 *   the tab is not visible (minimized or in the background). When visible, the
 *   app's in-app UI (toasts, sidebars) should handle the message.
 */
export default function ForegroundSystemNotifier() {
  useEffect(() => {
    // Subscribe to foreground messages
    const unsubscribe = onForegroundMessage(async (payload: MessagePayload) => {
      try {
        if (typeof window === 'undefined' || !('Notification' in window)) return

        // Only show OS notification when the page is NOT visible
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          return
        }

        // Do not trigger permission prompts here; only proceed if already granted
        if (Notification.permission !== 'granted') return

        const n = payload.notification || {}
        const data = (payload.data as Record<string, string> | undefined) || {}
        const title = n.title || data.title || 'Notification'
        const body = n.body || data.body || ''
        const icon = n.icon || data.icon || '/je-192.ico'
        const click_action = (payload?.fcmOptions?.link as string | undefined) || data.click_action || '/'

        const notif = new Notification(title, { body, icon, data: { click_action } })
        notif.onclick = () => {
          try {
            const url = (notif as Notification & { data?: { click_action?: string } })?.data?.click_action || '/'
            // Prefer same-tab navigation when possible
            if (url.startsWith('http') || url.startsWith('/')) {
              window.open(url, '_blank')
            }
          } catch {}
        }
      } catch {}
    })
    return () => unsubscribe()
  }, [])

  return null
}
