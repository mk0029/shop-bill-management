'use client'

import { useEffect } from 'react'
import { listenForegroundMessages } from '@/lib/fcm'

export default function ForegroundSystemNotifier() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    listenForegroundMessages(async (payload) => {
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        if (!('serviceWorker' in navigator)) return
        const registration = await navigator.serviceWorker.ready
        const worker = registration.active || navigator.serviceWorker.controller
        if (worker) {
          worker.postMessage({ type: 'SHOW_NOTIFICATION', payload })
          return
        }
        const title = payload.notification?.title || payload.data?.title || 'Notification'
        await registration.showNotification(title, {
          body: payload.notification?.body || payload.data?.body || '',
          icon: payload.data?.icon || '/je-p-192.png',
          badge: payload.data?.badge || '/je-p-48.png',
          data: payload.data,
        })
      } catch (error) {
        console.warn('[FCM] foreground notification failed', error)
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
