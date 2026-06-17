"use client";

import CustomerNotificationsClient from "@/components/customer/customer-notifications-client";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSettingsStore } from "@/store/settings-store";
import {
  initSoundOnUserGesture,
  playNotificationSound,
} from "@/lib/notification-sound";

export default function NotificationsPopover() {
  const { items, unread, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const showNotificationPopover = useSettingsStore(
    (s) => s.showNotificationPopover,
  );
  const playSoundOnNotification = useSettingsStore(
    (s) => s.playSoundOnNotification,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!open) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [open]);

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
      {showNotificationPopover &&
        mounted &&
        createPortal(
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
                  className="fixed inset-0 z-[180] h-[var(--app-vh,100dvh)] w-full bg-slate-950/62 backdrop-blur-md"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />

                <motion.div
                  key="notif-popover"
                  ref={popoverRef}
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="fixed inset-x-2 top-3 z-[190] max-h-[calc(var(--app-vh,100dvh))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop-blur-xl sm:inset-x-0 sm:top-2 sm:w-full sm:backdrop-blur-2xl xl:pl-64"
                  role="dialog"
                  aria-label="Notifications popover"
                >
                  <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="pointer-events-auto h-9 w-9 rounded-full border border-white/10 bg-white/[0.07] text-slate-200 shadow-lg shadow-black/20 backdrop-blur-2xl hover:bg-orange-300/15 hover:text-white sm:h-10 sm:w-10"
                      aria-label="Close notifications"
                      onClick={() => setOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <CustomerNotificationsClient
                    onRequestClose={() => setOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
