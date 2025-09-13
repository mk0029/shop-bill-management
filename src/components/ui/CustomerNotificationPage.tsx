"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"
import { clearNotifications, listNotifications } from "@/lib/notifications-dataset"

type NotificationDoc = {
  _id: string
  message: string
  time?: string
  createdAt?: string
  audience?: string
}

export default function CustomerNotificationsPage() {
  const { user, role } = useAuthStore()
  const userObj = user as unknown as { id?: string; _id?: string; phone?: string; clerkId?: string; customerId?: string; role?: string } | null
  const userId = userObj?.id || userObj?._id || ""
  const clerkId = userObj?.clerkId || ""
  const customerId = userObj?.customerId || ""
  const phone = userObj?.phone || ""
  const userRole = (role || userObj?.role || "customer") as string

  const [items, setItems] = useState<NotificationDoc[]>([])
  const unread = useMemo(() => items.length, [items])

  async function reload() {
    if (!userId && !clerkId && !customerId && !phone) {
      setItems([])
      return
    }
    const res = await listNotifications({
      userId,
      clerkId,
      customerId,
      role: userRole,
      phone,
      limit: 100,
      includeCleared: false,
    })
    const arr = Array.isArray(res.items) ? res.items : []
    setItems(arr as NotificationDoc[])
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole])

  async function markAllRead() {
    if (!userId || items.length === 0) return
    try {
      await clearNotifications({ userId, notificationIds: items.map(n => n._id) })
      await reload()
    } catch {
      // ignore for now
    }
  }

  async function clearOne(id: string) {
    if (!userId) return
    try {
      await clearNotifications({ userId, notificationId: id })
      setItems(prev => prev.filter(n => n._id !== id))
    } catch {
      // ignore for now
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">No notifications yet.</div>
        ) : (
          items.map(n => (
            <div key={n._id} className="p-4 flex items-start gap-3">
              <div className="mt-0.5">
                <Badge variant="secondary" className="capitalize">{n.audience || 'info'}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">Notification</p>
                <p className="text-gray-400 text-sm whitespace-pre-line">{n.message}</p>
                <p className="text-gray-500 text-[11px] mt-1">{new Date(n.time || n.createdAt || Date.now()).toLocaleString()}</p>
              </div>
              <div>
                <Button size="sm" variant="outline" onClick={() => void clearOne(n._id)}>Clear</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}