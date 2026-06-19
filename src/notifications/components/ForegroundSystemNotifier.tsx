'use client'

import { useEffect } from 'react'
import { listenForegroundMessages } from '@/lib/fcm'
import {
  clearAppSystemNotifications,
  markNotificationHandled,
  notificationIdentity,
} from '@/lib/notifications/dedupe'

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
