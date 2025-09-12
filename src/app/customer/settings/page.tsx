"use client"

import React from "react"
import NotificationSoundToggle from "@/components/notifications/notification-sound-toggle"
import { initSoundOnUserGesture, playNotificationSound } from "@/lib/notification-sound"
import { registerFcmToken } from "@/lib/fcm"
import { useAuthStore } from "@/store/auth-store"

export default function CustomerSettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [perm, setPerm] = React.useState<NotificationPermission | "unsupported">("default")
  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState("")

  React.useEffect(() => {
    try {
      if (typeof Notification === "undefined") setPerm("unsupported")
      else setPerm(Notification.permission)
    } catch {
      setPerm("unsupported")
    }
  }, [])

  const onEnableNotifications = async () => {
    setBusy(true)
    setStatus("")
    try {
      if (typeof Notification === "undefined") {
        setStatus("Notifications are not supported on this device/browser.")
        return
      }
      if (Notification.permission !== "granted") {
        try { await Notification.requestPermission() } catch {}
      }
      setPerm(Notification.permission)
      if (Notification.permission === "granted") {
        const userId = user?.id ?? null
        if (userId) {
          try { await registerFcmToken({ userId }) } catch {}
          setStatus("Notifications enabled and device registered.")
        } else {
          setStatus("Notifications enabled. Please log in to register your device.")
        }
      } else if (Notification.permission === "denied") {
        setStatus("Notifications are blocked in your browser settings.")
      } else {
        setStatus("Permission request dismissed.")
      }
    } finally {
      setBusy(false)
    }
  }

  const onTestSound = () => {
    initSoundOnUserGesture()
    void playNotificationSound()
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Notifications</h2>
        <p className="text-sm text-gray-600">Control push notifications and foreground sound.</p>
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm"><strong>Permission:</strong> {perm}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onEnableNotifications}
              disabled={busy}
              className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
            >
              {busy ? "Working..." : "Enable notifications"}
            </button>

            <div className="flex items-center gap-2">
              <NotificationSoundToggle />
              <button
                type="button"
                onClick={onTestSound}
                className="inline-flex items-center rounded-md bg-gray-200 px-3 py-1"
                title="Play test sound"
              >
                Play test sound
              </button>
            </div>
          </div>
          {status && (
            <div className="rounded-md border p-3 text-sm bg-gray-50">{status}</div>
          )}
        </div>
      </section>

      {/* Add other minimal settings here in the future */}
    </div>
  )
}
