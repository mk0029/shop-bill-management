'use client'

import { useEffect } from 'react'
import { listenForegroundMessages } from '@/lib/fcm'
import {
  clearAppSystemNotifications,
  markNotificationHandled,
  notificationIdentity,
  postNotificationWorkerMessage,
} from '@/lib/notifications/dedupe'

export default function ForegroundSystemNotifier() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    listenForegroundMessages(async (payload) => {
      try {
        const data = payload.data || {}
        const id = notificationIdentity({
          id: data.id,
          notificationId: data.notificationId,
          messageId: data.messageId,
          roomId: data.roomId,
          tag: data.tag,
        })

        if (document.visibilityState !== 'visible') {
          const workerPayload = {
            ...payload,
            notification: {
              title: payload.notification?.title || data.title || 'Notification',
              body: payload.notification?.body || data.body || '',
            },
            data: {
              ...data,
              id,
              notificationId: data.notificationId || data.id || id,
            },
          }

          const posted = await postNotificationWorkerMessage({
            type: 'SHOW_NOTIFICATION',
            payload: workerPayload,
          })

          if (!posted && 'Notification' in window && Notification.permission === 'granted') {
            const registration = await navigator.serviceWorker?.ready
            await registration?.showNotification(workerPayload.notification.title, {
              body: workerPayload.notification.body,
              icon: data.icon || '/je-p-192.png',
              badge: data.badge || '/je-p-48.png',
              tag: data.tag || id,
              renotify: true,
              requireInteraction: true,
              data: {
                ...data,
                id,
                notificationId: data.notificationId || data.id || id,
                link: payload.fcmOptions?.link || data.click_action || data.route || '/',
              },
            })
          }
          return
        }

        markNotificationHandled(id)
        clearAppSystemNotifications({
          id,
          tag: data.tag,
          roomId: data.roomId,
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
