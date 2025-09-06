"use client"

import React from "react"
import NotificationSoundToggle from "@/components/notifications/notification-sound-toggle"
import { initSoundOnUserGesture, playNotificationSound } from "@/lib/notification-sound"
import { getTokenWithoutRegister } from "@/lib/fcm-client"

export default function NotificationsSetupPage() {
  const [token, setToken] = React.useState<string | null>(null)
  const [perm, setPerm] = React.useState<NotificationPermission | "unsupported">("default")
  const [standalone, setStandalone] = React.useState<boolean>(false)
  const [platform, setPlatform] = React.useState<string>("web")
  const [busy, setBusy] = React.useState<boolean>(false)
  const [status, setStatus] = React.useState<string>("")

  React.useEffect(() => {
    try {
      if (typeof Notification === "undefined") setPerm("unsupported")
      else setPerm(Notification.permission)
    } catch {
      setPerm("unsupported")
    }

    try {
      const isStandalone = (() => {
        if (typeof window !== "undefined" && "matchMedia" in window) {
          if (window.matchMedia("(display-mode: standalone)").matches) return true
        }
        const navIOS = navigator as Navigator & { standalone?: boolean }
        return navIOS.standalone === true
      })()
      setStandalone(isStandalone)
    } catch {}

    try {
      const ua = navigator.userAgent || ""
      if (/Android/i.test(ua)) setPlatform("android")
      else if (/iPhone|iPad|iPod/i.test(ua)) setPlatform("ios")
      else setPlatform("web")
    } catch {}
  }, [])

  const onEnable = async () => {
    setStatus("")
    setBusy(true)
    try {
      // Request permission if not already granted, then get a token without registering it
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        try { await Notification.requestPermission() } catch {}
      }
      const t = await getTokenWithoutRegister()
      if (!t) {
        setStatus("Permission denied or token unavailable.")
      } else {
        setToken(t)
        setStatus("Token acquired. You can send a test notification now.")
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to enable notifications."
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  const onTestPush = async () => {
    setStatus("")
    if (!token) {
      setStatus("No token. Click 'Enable notifications' first.")
      return
    }
    setBusy(true)
    try {
      const resp = await fetch("/api/fcm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title: "Test notification",
          body: "This is a test push from the Notifications Setup page.",
          data: { type: "test" },
        }),
      })
      if (!resp.ok) {
        const err = await resp.text().catch(() => "")
        setStatus(`Push failed: ${err || resp.statusText}`)
      } else {
        setStatus("Push sent. Check for OS popup/notification.")
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send test notification."
      setStatus(msg)
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
      <h1 className="text-xl font-semibold">Notifications Setup</h1>

      <div className="rounded-md border p-4 space-y-2">
        <div><strong>Platform:</strong> {platform}</div>
        <div><strong>Display mode:</strong> {standalone ? "PWA (standalone)" : "Browser tab"}</div>
        <div><strong>Permission:</strong> {perm}</div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Enable Notifications</h2>
        <p className="text-sm text-gray-600">Click to request permission and fetch a test token.</p>
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Working..." : "Enable notifications"}
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Foreground Sound</h2>
        <p className="text-sm text-gray-600">Toggle sound for foreground messages and test a short chirp.</p>
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

      <div className="space-y-2">
        <h2 className="font-medium">Send Test OS Notification</h2>
        <p className="text-sm text-gray-600">
          This sends a push directly to your current token via <code>/api/fcm/send</code>. For mobile devices, ensure OS
          notifications are allowed, sound/banners enabled, and the app is installed as a PWA for iOS.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTestPush}
            disabled={busy || !token}
            className="inline-flex items-center rounded-md bg-green-600 text-white px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send test notification"}
          </button>
          <code className="text-xs break-all">{token || "(no token yet)"}</code>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Android Setup Tips</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li><strong>Enable notifications</strong> for your site/PWA in OS settings.</li>
          <li><strong>Set channel importance to High</strong> and enable <strong>Pop on screen</strong> and <strong>Sound</strong>.</li>
          <li>If using Chrome tab, check Chrome → Site settings → Notifications → your domain: allow sound and pop-ups.</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">iOS Setup Tips</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li><strong>Install as PWA</strong> (Add to Home Screen). iOS only delivers web push to installed web apps.</li>
          <li>iOS Settings → Notifications → [Your App] → <strong>Allow</strong>, <strong>Banners</strong>, <strong>Sounds</strong>, <strong>Persistent</strong>.</li>
        </ul>
      </div>

      {status && (
        <div className="rounded-md border p-3 text-sm bg-gray-50">
          {status}
        </div>
      )}
    </div>
  )
}
