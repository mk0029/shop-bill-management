"use client";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CustomerNotificationsPage from "./CustomerNotificationPage";

export default function CustomerNotifications() {
  const { items, markAllRead } = useNotificationStore();
  const user = useAuthStore((s) => s.user) as { id?: string; _id?: string; role?: string } | null;
  const userId = user?._id || user?.id;
  const userRole = user?.role;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Filter notifications for customers to get accurate unread count
  const filteredItems = useMemo(() => {
    if (userRole === 'admin') return items;
    
    if (userRole === 'customer') {
      return items.filter(n => {
        const meta = n.meta;
        // Shop status notifications - all customers should see these
        if (meta?.type === 'shop_status' || 
            n.title?.includes('Shop is') || 
            n.title?.includes('Available') ||
            n.title?.includes('Offline')) return true;
        // Bill and payment notifications - only if it's for this customer
        if ((n.type === 'billing' || n.type === 'payment') && meta?.userId) return meta.userId === userId;
        // Chat notifications - only if it's for this customer
        if (n.type === 'chat' && meta?.userId) return meta.userId === userId;
        // Inventory notifications - customers should NOT see these
        if (n.type === 'inventory') return false;
        // System notifications without shop_status type - filter out
        if (n.type === 'system' && meta?.type !== 'shop_status') return false;
        return false;
      });
    }
    
    return items;
  }, [items, userRole, userId]);

  const filteredUnread = useMemo(() => {
    return filteredItems.filter(n => !n.read).length;
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
    if (open && filteredUnread > 0) {
      // Auto mark all as read on open for simplicity
      markAllRead();
    }
  }, [open, filteredUnread, markAllRead]);

  // Note: Avoid locking body scroll to prevent interference when multiple bells exist

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
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 backdrop-blur-2xl h-fit w-full z-[60] xl:pl-64"
              role="dialog"
              aria-label="Notifications popover"
            >
            <div className="relative w-full py-5">
              <Button size="icon" variant="ghost" className="right-6 top-1/3 absolute px-3" aria-label="Close notifications" onClick={() => setOpen(false)}>
              Close
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
