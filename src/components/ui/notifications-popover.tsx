"use client";

import AdminNotificationsPage from "@/app/customer/notifications/page";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settings-store";
import { initSoundOnUserGesture, playNotificationSound } from "@/lib/notification-sound";

export default function NotificationsPopover() {
  const { items, unread, markAllRead, clear, markAsRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const showInAppNotifications = useSettingsStore((s) => s.showInAppNotifications);
  const showNotificationPopover = useSettingsStore((s) => s.showNotificationPopover);
  const playSoundOnNotification = useSettingsStore((s) => s.playSoundOnNotification);

  // Respect: Hide entirely if in-app notifications are disabled
  if (!showInAppNotifications) return null;

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      const clickedAnchor = anchorRef.current?.contains(t);
      const clickedPopover = popoverRef.current?.contains(t);
      if (anchorRef.current && !clickedAnchor && !clickedPopover) {
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

  // Play a short sound when new notifications arrive (if enabled)
  const prevCountRef = useRef<number>(items.length);
  useEffect(() => {
    if (!playSoundOnNotification) {
      prevCountRef.current = items.length;
      return;
    }
    const prev = prevCountRef.current;
    const curr = items.length;
    if (curr > prev) {
      try {
        initSoundOnUserGesture();
        void playNotificationSound();
      } catch {}
    }
    prevCountRef.current = curr;
  }, [items.length, playSoundOnNotification]);

  // Note: Avoid locking body scroll to prevent interference when multiple bells exist

  return (
    <div className="relative">
      <Button
        ref={anchorRef}
        variant="ghost"
        size="sm"
        onClick={() => {
          // If popover disabled by settings, just mark all read on click
          if (!showNotificationPopover) {
            if (unread > 0) markAllRead();
            return;
          }
          setOpen((s) => !s);
        }}
        className="relative text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-full"
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

      {/* If popover is disabled, do not render it */}
      {showNotificationPopover && (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop overlay with blur for mobile and desktop */}
            <motion.div
              key="notif-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/80 blur-md h-screen w-full"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          
            <motion.div
              key="notif-popover"
              ref={popoverRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`fixed inset-0 backdrop-blur-2xl ${composerOpen ? "h-screen" : "h-fit"} w-full z-[60] xl:pl-64`}
              role="dialog"
              aria-label="Notifications popover"
            >
            <div className="relative w-full py-5">
              <Button size="icon" variant="ghost" className="right-6 top-1/3 absolute px-3" aria-label="Close notifications" onClick={() => setOpen(false)}>
              Close
              </Button>
            </div>
            <AdminNotificationsPage composerOpen={composerOpen} setComposerOpen={setComposerOpen} onNavigate={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      )}
    </div>
  );
}
