"use client"

import { useNotificationStore } from "@/store/notification-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel"
import AdminFCMInitializer from "@/components/notifications/AdminFCMInitializer"

export default function AdminNotificationsPage() {
  const { items, unread, markAllRead, clear, markAsRead } = useNotificationStore()

  return (
    <div className="p-4 sm:p-6">
      <AdminFCMInitializer />
      <AdminTestPushPanel />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm">All notifications are stored locally until you clear them.</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        {items.length === 0 ? (
          <div className="p-6 text-gray-400">No notifications yet.</div>
        ) : (
          items.map(n => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <div className="mt-0.5">
                <Badge variant="secondary" className="capitalize">{n.type}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{n.title}</p>
                <p className="text-gray-400 text-sm whitespace-pre-line">{n.body}</p>
                <p className="text-gray-500 text-[11px] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Mark read</Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
