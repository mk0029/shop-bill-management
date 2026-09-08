"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  useNotificationStore,
  buildNotificationHref,
  type AppNotification,
} from "@/store/notification-store";
import { buildEventHref } from "@/lib/event-navigation";
import { clearNotifications } from "@/lib/notifications-dataset";
import { useAuthStore } from "@/store/auth-store";

// Query keys that point at a specific entity (deep link). Notifications whose
// target carries one of these (or a #hash) are only cleared when the user
// actually lands on that entity's page, not merely its listing page.
const ENTITY_QUERY_KEYS = [
  "open",
  "id",
  "billId",
  "transaction",
  "taskId",
  "rentalId",
  "offerId",
  "productId",
  "sourceId",
  "messageId",
];

type Target = {
  pathname: string;
  query: URLSearchParams;
  hash: string;
};

function notificationTarget(n: AppNotification): Target | null {
  const href = buildEventHref(n) || buildNotificationHref(n);
  if (!href) return null;
  const [pathAndQuery = "", hash = ""] = href.split("#");
  const [pathname = "", query = ""] = pathAndQuery.split("?");
  return { pathname, query: new URLSearchParams(query), hash };
}

function isEntityDeepLink(target: Target): boolean {
  if (target.hash) return true;
  return ENTITY_QUERY_KEYS.some((key) => target.query.has(key));
}

function deepLinkMatches(target: Target): boolean {
  if (typeof window === "undefined") return false;
  const currentHash = window.location.hash.replace(/^#/, "");
  if (target.hash) {
    return currentHash === target.hash;
  }
  const currentQuery = new URLSearchParams(window.location.search);
  for (const [key, value] of target.query.entries()) {
    if (currentQuery.get(key) !== String(value)) return false;
  }
  return true;
}

/**
 * Auto-clear in-app notifications once the user visits the URL the
 * notification points to (e.g. visiting /admin/customers clears the
 * "New Customer Registration Request" notification for it).
 */
export default function RouteVisitAutoClear() {
  const pathname = usePathname();
  const handledPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || handledPath.current === pathname) return;
    handledPath.current = pathname;

    const user = useAuthStore.getState().user as {
      _id?: string;
      id?: string;
      role?: string;
      phone?: string;
      customerId?: string;
    } | null;
    const userId = user?._id || user?.id;
    const phone = user?.phone;
    const store = useNotificationStore.getState();

    const hits: string[] = [];
    for (const n of store.items) {
      const target = notificationTarget(n);
      if (!target || target.pathname !== pathname) continue;
      if (isEntityDeepLink(target) && !deepLinkMatches(target)) continue;
      hits.push(n.id);
    }

    if (!hits.length) return;

    store.removeWhere((item) => hits.includes(item.id));
    if (userId || phone) {
      clearNotifications({ userId, phone, notificationIds: hits }).catch(() => {
        // best-effort server-side clear; local removal already applied
      });
    }
  }, [pathname]);

  return null;
}