"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2 } from "lucide-react";
import { useNotificationStore } from "@/store/notification-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPopover() {
  const { items, unread, markAllRead, clear, markAsRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (
        anchorRef.current &&
        !anchorRef.current.contains(t) &&
        !(document.getElementById("notif-popover")?.contains(t) ?? false)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && unread > 0) {
      // Auto mark all as read on open for simplicity
      markAllRead();
    }
  }, [open, unread, markAllRead]);

  const header = useMemo(() => {
    if (items.length === 0) return "No notifications";
    return `Notifications (${items.length})`;
  }, [items.length]);

  return (
    <div className="relative">
      <Button
        ref={anchorRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen((s) => !s)}
        className="relative"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 sm:-top-1 right-0.5 sm:-right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="notif-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[90vw] max-w-sm bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-[60]"
            role="dialog"
            aria-label="Notifications popover"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <p className="text-white text-sm font-medium">{header}</p>
              <div className="flex gap-2">
                {items.length > 0 && (
                  <Button size="sm" variant="outline" onClick={clear} className="h-7 py-1">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-800">
              {items.length === 0 && (
                <div className="p-4 text-sm text-gray-400">You're all caught up.</div>
              )}
              {items.map((n) => (
                <div key={n.id} className="p-3 flex items-start gap-3 hover:bg-gray-800">
                  <div className="mt-0.5">
                    <Badge variant="secondary" className="capitalize">
                      {n.type}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{n.title}</p>
                    <p className="text-gray-400 text-xs line-clamp-2">{n.body}</p>
                    <p className="text-gray-500 text-[11px] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markAsRead(n.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
