"use client";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CustomerNotificationsPage from "./CustomerNotificationPage";

export default function CustomerNotifications() {
  const { items } = useNotificationStore();
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
  } | null;
  const userId = user?._id || user?.id;
  const userRole = user?.role;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Filter notifications for customers to get accurate unread count
  const filteredItems = useMemo(() => {
    if (userRole === "admin") return items;

    if (userRole === "customer") {
      return items.filter((n) => {
        const meta = n.meta;
        // Shop status notifications - all customers should see these
        if (
          meta?.type === "shop_status" ||
          n.title?.includes("Shop is") ||
          n.title?.includes("Available") ||
          n.title?.includes("Offline")
        ) {
          return true;
        }
        if (n.type === "chat" || meta?.type === "shop_chat") {
          return meta?.userId === userId;
        }
        // Bill and payment notifications - only if it's for this customer
        if ((n.type === "billing" || n.type === "payment") && meta?.userId) {
          return meta.userId === userId;
        }
        // Inventory notifications - customers should NOT see these
        if (n.type === "inventory") return false;
        // System notifications without shop_status type - filter out
        if (n.type === "system" && meta?.type !== "shop_status") return false;
        return false;
      });
    }

    return items;
  }, [items, userRole, userId]);

  const filteredUnread = useMemo(() => {
    return filteredItems.filter((n) => !n.read).length;
  }, [filteredItems]);

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

  return (
    <div className="relative">
      <Button
        ref={anchorRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen((s) => !s)}
        className="relative text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-full"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {filteredUnread > 0 && (
          <span className="absolute top-0.5 sm:-top-1 right-0.5 sm:-right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
            {filteredUnread > 9 ? "9+" : filteredUnread}
          </span>
        )}
      </Button>

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
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="fixed inset-x-2 top-2 z-[60] max-h-[calc(100dvh-1rem)] overflow-y-auto backdrop-blur-xl sm:inset-x-0 sm:top-0 sm:w-full sm:backdrop-blur-2xl xl:pl-64"
              role="dialog"
              aria-label="Notifications popover"
            >
              <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
                <Button
                  size="icon"
                  variant="ghost"
                  className="pointer-events-auto h-9 w-9 rounded-full border border-slate-700/80 bg-slate-950/90 text-slate-300 shadow-lg shadow-black/20 hover:bg-slate-800 hover:text-white sm:h-10 sm:w-10"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CustomerNotificationsPage />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
