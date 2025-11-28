"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNotificationStore } from "@/store/notification-store"
import { useAuthStore } from "@/store/auth-store"
import { useMemo } from "react"

export default function CustomerNotificationsPage() {
  const { items, markAllRead, clear, markAsRead } = useNotificationStore()
  const user = useAuthStore((s) => s.user) as { id?: string; _id?: string; role?: string } | null
  const userId = user?._id || user?.id
  const userRole = user?.role

  // Filter notifications for customers - only show relevant ones
  const filteredItems = useMemo(() => {
    // Admins see all notifications
    if (userRole === 'admin') return items

    // Customers should only see:
    // 1. Their own bill/payment notifications
    // 2. Their own chat notifications
    // 3. Shop status notifications
    if (userRole === 'customer') {
      return items.filter(n => {
        const meta = n.meta

        // Shop status notifications - all customers should see these
        // Check both meta.type and the notification title/body for shop status
        if (meta?.type === 'shop_status' || 
            n.title?.includes('Shop is') || 
            n.title?.includes('Available') ||
            n.title?.includes('Offline')) {
          return true
        }

        // Bill and payment notifications - only if it's for this customer
        if ((n.type === 'billing' || n.type === 'payment') && meta?.userId) {
          return meta.userId === userId
        }

        // Chat notifications - only if it's for this customer
        if (n.type === 'chat' && meta?.userId) {
          return meta.userId === userId
        }

        // Inventory notifications - customers should NOT see these
        if (n.type === 'inventory') {
          return false
        }

        // System notifications without shop_status type - filter out
        if (n.type === 'system' && meta?.type !== 'shop_status') {
          return false
        }

        // Default: don't show if we can't determine ownership
        return false
      })
    }

    // Default: show all for unknown roles (shouldn't happen)
    return items
  }, [items, userRole, userId])

  const filteredUnread = useMemo(() => {
    return filteredItems.filter(n => !n.read).length
  }, [filteredItems])

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filteredUnread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Button>
          )}
          {filteredItems.length > 0 && (
            <Button size="sm" variant="outline" onClick={clear}>Clear All</Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        {filteredItems.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">No notifications yet.</div>
        ) : (
          filteredItems.map(n => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <div className="mt-0.5">
                <Badge variant={n.read ? "outline" : "secondary"} className="capitalize">{n.type}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{n.title}</p>
                <p className="text-gray-400 text-sm whitespace-pre-line">{n.body}</p>
                <p className="text-gray-500 text-[9px] md:text-[11px] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {!n.read && (
                  <Button size="sm" variant="secondary" onClick={() => markAsRead(n.id)}>Mark read</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}