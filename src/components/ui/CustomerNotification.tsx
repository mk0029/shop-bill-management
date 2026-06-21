"use client";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CustomerNotificationsPage from "./CustomerNotificationPage";
import { isCustomerNotificationVisible } from "@/lib/notifications/customer";

const QUERY_PARAM = "notifications=1";

export default function CustomerNotifications() {
  const { items } = useNotificationStore();
  const user = useAuthStore((s) => s.user) as {
    id?: string;
    _id?: string;
    role?: string;
    customerId?: string;
  } | null;
  const userId = user?._id || user?.id;
  const userRole = user?.role;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On mount, clear stale notification param from a full page refresh
  useEffect(() => {
    if (window.location.search.includes(QUERY_PARAM)) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Sync open state with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (openRef.current && !window.location.search.includes(QUERY_PARAM)) {
        setOpen(false);
        openRef.current = false;
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleToggle = useCallback(() => {
    if (openRef.current) {
      handleClose();
    } else {
      window.history.pushState({ notifications: true }, "", `?${QUERY_PARAM}`);
      setOpen(true);
      openRef.current = true;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (!openRef.current) return;
    setOpen(false);
    openRef.current = false;
    if (window.location.search.includes(QUERY_PARAM)) {
      window.history.back();
    }
  }, []);

  const handleCloseSilent = useCallback(() => {
    if (!openRef.current) return;
    setOpen(false);
    openRef.current = false;
    if (window.location.search.includes(QUERY_PARAM)) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Filter notifications for customers to get accurate unread count
  const filteredItems = useMemo(() => {
    return items.filter((notification) =>
      isCustomerNotificationVisible(notification, {
        userId: userId || undefined,
        customerId: user?.customerId,
        role: userRole || undefined,
      }),
    );
  }, [items, userRole, userId, user?.customerId]);

  const filteredUnread = useMemo(() => {
    return filteredItems.filter((n) => !n.read).length;
  }, [filteredItems]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!openRef.current) return;
      const t = e.target as Node;
      const clickedAnchor = anchorRef.current?.contains(t);
      const clickedPopover = popoverRef.current?.contains(t);
      if (anchorRef.current && !clickedAnchor && !clickedPopover) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
        onClick={handleToggle}
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

      {mounted &&
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
                  onClick={handleClose}
                  aria-hidden="true"
                />

                <motion.div
                  key="notif-popover"
                  ref={popoverRef}
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="fixed inset-x-2 top-3 z-[190] max-h-[calc(var(--app-vh,100dvh)-2.5rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden backdrop-blur-xl sm:inset-x-0 sm:top-2 sm:w-full sm:backdrop-blur-2xl xl:pl-64"
                  role="dialog"
                  aria-label="Notifications popover"
                >
                  <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="pointer-events-auto h-9 w-9 rounded-full border border-white/10 bg-white/[0.07] text-slate-200 shadow-lg shadow-black/20 backdrop-blur-2xl hover:bg-orange-300/15 hover:text-white sm:h-10 sm:w-10"
                      aria-label="Close notifications"
                      onClick={handleClose}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <CustomerNotificationsPage
                    onRequestClose={handleClose}
                    onRequestCloseSilent={handleCloseSilent}
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
