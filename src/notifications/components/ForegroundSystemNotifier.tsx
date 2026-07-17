'use client'

import { useEffect } from 'react'
import { listenForegroundMessages } from '@/lib/fcm'
import {
  clearAppSystemNotifications,
  markNotificationHandled,
  notificationIdentity,
} from '@/lib/notifications/dedupe'
import { useNotificationStore } from '@/store/notification-store'

export default function ForegroundSystemNotifier() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    listenForegroundMessages(async (payload) => {
      try {
        const data = payload.data || {}
        const id = notificationIdentity({
          dedupeKey: data.dedupeKey,
          id: data.id,
          notificationId: data.notificationId,
          messageId: data.messageId,
          roomId: data.roomId,
          tag: data.tag,
        })

        if (document.visibilityState !== 'visible') {
          markNotificationHandled(id)
          return
        }

        markNotificationHandled(id)
        clearAppSystemNotifications({
          id,
          tag: data.tag,
          roomId: data.roomId,
        })

        // Add to in-app notification store so NotificationToaster can display it
        const title = payload.notification?.title || data.title || 'Notification'
        const body = payload.notification?.body || data.body || ''
        const eventType = data.type || data.event || 'system.general'
        useNotificationStore.getState().add({
          id: id || `fg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'system',
          title,
          body,
          createdAt: new Date().toISOString(),
          meta: {
            source: 'push',
            type: eventType,
            eventType,
            tag: data.tag,
            route: data.route ? { pathname: data.route } : undefined,
          },
        })
      } catch (error) {
        console.warn('[FCM] foreground notification handling failed', error)
      }
    })
      .then((off) => {
        unsubscribe = off
      })
      .catch(() => undefined)

    return () => {
      try {
        unsubscribe?.()
      } catch {}
    }
  }, [])

  return null
}
