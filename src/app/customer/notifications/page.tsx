"use client"

import React from "react"
import { useNotificationStore } from "@/store/notification-store"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel"
import AdminFCMInitializer from "@/components/notifications/AdminFCMInitializer"
// Removed sound toggle per request
import Link from "next/link"
import { buildNotificationHref } from "@/store/notification-store"
import SWNotificationBridge from "@/components/notifications/sw-bridge"
import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel"

type Props = { composerOpen: boolean; setComposerOpen: (open: boolean) => void; onNavigate?: () => void };
export default function AdminNotificationsPage({composerOpen, setComposerOpen, onNavigate}: Props) {
  const { items, unread, markAllRead, clear, markAsRead, clearRead } = useNotificationStore()

  return (
    <div className="p-4 sm:p-6">
      <SWNotificationBridge />
      <AdminFCMInitializer />
      <AdminTestPushPanel composerOpen={composerOpen} setComposerOpen={setComposerOpen} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Button>
          )}
          {(items || []).some(n => !!n.read) && (
            <Button size="sm" variant="outline" onClick={clearRead}>Clear read</Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        {items.length === 0 ? (
          <div className="p-3 sm:p-4 md:p-6 text-gray-400">No notifications yet.</div>
        ) : (
          items.map(n => {
            const href = buildNotificationHref(n)
            return (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary" className="capitalize">{n.type}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{n.title}</p>
                  <p className="text-gray-400 text-sm whitespace-pre-line">{n.body}</p>
                  {(n.meta?.user || n.meta?.userId) && (
                    <p className="text-gray-400 text-xs mt-1">
                      {n.meta?.user?.name && <span className="mr-2">{n.meta.user.name}</span>}
                      {n.meta?.user?.email && <span className="mr-2">({n.meta.user.email})</span>}
                      <span className="text-gray-500">ID: {n.meta?.user?.id || n.meta?.userId}</span>
                    </p>
                  )}
                  <p className="text-gray-500text-[9px] md:text-[11px] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {href && (
                    <Link
                      href={href}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      onClick={() => { try { markAsRead(n.id); } catch {}; try { onNavigate?.(); } catch {} }}
                    >
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Mark read</Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}