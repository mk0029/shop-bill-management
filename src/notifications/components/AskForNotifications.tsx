'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/auth-store'
import { registerFcmToken } from '../../lib/fcm'
import { toast } from 'sonner'

/**
 * AskForNotifications
 * - Uses native OS/browser Notification permission prompt (no custom UI)
 * - Managed by useState: defaults to true; set to false once user allows (granted)
 * - Mount this once globally (e.g., in RootLayout)
 */
export default function AskForNotifications() {
  const user = useAuthStore((s) => s.user)
  const [ask, setAsk] = useState<boolean>(true)
  const toastIdRef = useRef<string | number | null>(null)

  // Helper to show guidance when notifications are hard-blocked by the browser
  function showBlockedInfo() {
    if (toastIdRef.current != null) toast.dismiss(toastIdRef.current)
    toastIdRef.current = toast('Enable notifications in browser settings', {
      description:
        'Notifications are blocked by your browser. Click the padlock icon in the address bar → Site settings → Notifications: Allow, then reload.',
      duration: 15000,
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      // Browser/environment does not support notifications
      setAsk(false)
      return
    }

    // If already granted, no need to ask again
    if (Notification.permission === 'granted') {
      setAsk(false)
      // Opportunistically register token on mount if user exists
      const userId = user?.id ?? null
      if (userId) registerFcmToken({ userId }).catch(() => {})
      // Dismiss any existing toast (if any)
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
      return
    }

    // Request permission if we should ask and the current state is default or denied
    if (ask && (Notification.permission === 'default' || Notification.permission === 'denied')) {
      // This triggers the native OS/browser permission popup
      Promise.resolve(Notification.requestPermission())
        .then((result) => {
          if (result === 'granted') {
            setAsk(false)
            const userId = user?.id ?? null
            if (userId) registerFcmToken({ userId }).catch(() => {})
            if (toastIdRef.current != null) {
              toast.dismiss(toastIdRef.current)
              toastIdRef.current = null
            }
          } else if (result === 'denied') {
            // Show a toast prompting user to enable notifications with an action button
            if (toastIdRef.current == null) {
              toastIdRef.current = toast('Notifications are blocked', {
                description: 'Allow push notifications to receive bill and system updates.',
                action: {
                  label: 'Allow notifications',
                  onClick: async () => {
                    try {
                      // If browser state is default, we can still trigger the native prompt
                      if (Notification.permission === 'default') {
                        const res = await Notification.requestPermission()
                        if (res === 'granted') {
                          setAsk(false)
                          const userId = user?.id ?? null
                          if (userId) registerFcmToken({ userId }).catch(() => {})
                          if (toastIdRef.current != null) {
                            toast.dismiss(toastIdRef.current)
                            toastIdRef.current = null
                          }
                          return
                        }
                      }
                      // If permission is denied (most browsers won’t re-prompt), show guidance
                      showBlockedInfo()
                    } catch {
                      showBlockedInfo()
                    }
                  },
                },
                duration: 12000,
              })
            }
          }
        })
        .catch(() => {
          // Ignore errors (user closed prompt, etc.)
        })
    }
  }, [ask, user])

  // Re-show toast when user focuses the tab if still denied
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const onFocus = () => {
      if (Notification.permission === 'denied') {
        if (toastIdRef.current == null) {
          toastIdRef.current = toast('Notifications are blocked', {
            description: 'Allow push notifications to receive bill and system updates.',
            action: {
              label: 'Allow notifications',
              onClick: async () => {
                try {
                  if (Notification.permission === 'default') {
                    const res = await Notification.requestPermission()
                    if (res === 'granted') {
                      setAsk(false)
                      const userId = user?.id ?? null
                      if (userId) registerFcmToken({ userId }).catch(() => {})
                      if (toastIdRef.current != null) {
                        toast.dismiss(toastIdRef.current)
                        toastIdRef.current = null
                      }
                      return
                    }
                  }
                  showBlockedInfo()
                } catch {
                  showBlockedInfo()
                }
              },
            },
            duration: 12000,
          })
        }
      } else if (Notification.permission === 'granted') {
        if (toastIdRef.current != null) {
          toast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }
      }
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [user])

  // No custom UI is needed; native prompt handles itself
  return null
}
