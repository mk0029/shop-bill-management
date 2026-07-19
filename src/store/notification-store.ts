import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isNotificationRecent } from "@/lib/notifications/age";

export type AppNotificationType =
  | "billing"
  | "inventory"
  | "system"
  | "payment"
  | "chat"
  | "offer";

// Optional structured metadata we can attach to a notification
export type AppNotificationRoute = {
  pathname: string;
  // Will be converted to string query params; null/undefined values are omitted
  query?: Record<string, string | number | boolean | null | undefined>;
};

export interface AppNotificationMeta extends Record<string, unknown> {
  // If the notification is about a specific user, we can store their id and basic details
  userId?: string;
  user?: { id?: string; name?: string; email?: string; phone?: string };
  // Optional route we can navigate to from the notification
  route?: AppNotificationRoute;
  // Optional priority and source for pushed notifications
  priority?: "high" | "normal";
  source?: "push" | "realtime" | string;
}

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO string
  read?: boolean;
  meta?: AppNotificationMeta;
}

interface NotificationState {
  items: AppNotification[];
  unread: number;
  // Track which notification IDs have already been shown as a toast (persisted)
  toasted: Record<string, true>;
  add: (n: Omit<AppNotification, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  addMany: (list: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  removeWhere: (predicate: (notification: AppNotification) => boolean) => void;
  clear: () => void;
  // Remove all notifications that are already read (keep unread only)
  clearRead: () => void;
  // Mark a notification as having been shown as a toast
  markToasted: (id: string) => void;
  // Check if a notification has already been shown as a toast
  isToasted: (id: string) => boolean;
}

type PersistedNotificationState = Pick<
  NotificationState,
  "items" | "unread" | "toasted"
>;

export const useNotificationStore = create<NotificationState>()(
  persist<NotificationState, [], [], PersistedNotificationState>(
    (set) => ({
      items: [],
      unread: 0,
      toasted: {},

      add: (n) =>
        set((state) => {
          // 1) De-dup by id if provided
          if (n.id && state.items.some((x) => x.id === n.id)) {
            return state;
          }

          const createdAt = n.createdAt || new Date().toISOString();
          const eventType = String(n.meta?.eventType || n.meta?.type || n.type || "");
          if (!isNotificationRecent(createdAt, undefined, eventType)) {
            return state;
          }
          const nowTs = Date.now();
          const incomingTs = Date.parse(createdAt) || nowTs;
          const windowMs = 2 * 60 * 1000; // 2 minutes

          // 2) De-dup by same title+body within short time window
          const hasRecentSameContent = state.items.some((x) =>
            x.title === n.title &&
            x.body === n.body &&
            Math.abs((Date.parse(x.createdAt) || nowTs) - incomingTs) < windowMs
          );
          if (hasRecentSameContent) {
            return state;
          }

          const item: AppNotification = {
            id: n.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt,
            read: false,
            ...n,
          };
          const items = [item, ...state.items]
            .filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")))
            .slice(0, 100); // cap to 100
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      addMany: (list) =>
        set((state) => {
          const nowTs = Date.now();
          const windowMs = 2 * 60 * 1000; // 2 minutes
          const existing = state.items.filter((item) =>
            isNotificationRecent(item.createdAt, nowTs, String(item.meta?.eventType || item.meta?.type || item.type || "")),
          );
          const byId = new Map(existing.map((item) => [item.id, item]));
          const mergedExisting = new Map(byId);
          const newItems: AppNotification[] = [];

          for (const incoming of list) {
            const createdAt = incoming.createdAt || new Date().toISOString();
            const incomingType = String(incoming.meta?.eventType || incoming.meta?.type || incoming.type || "");
            if (!isNotificationRecent(createdAt, nowTs, incomingType)) continue;
            const n: AppNotification = {
              ...incoming,
              createdAt,
              read: incoming.read ?? false,
            };

            if (n.id && byId.has(n.id)) {
              const current = byId.get(n.id)!;
              mergedExisting.set(n.id, {
                ...current,
                ...n,
                meta: { ...(current.meta || {}), ...(n.meta || {}) },
                read: Boolean(current.read || n.read),
              });
              continue;
            }

            const ts = Date.parse(n.createdAt) || nowTs;
            // De-dup by same content within window
            const dup = [...mergedExisting.values(), ...newItems].some((x) =>
              x.title === n.title && x.body === n.body && Math.abs((Date.parse(x.createdAt) || nowTs) - ts) < windowMs
            );
            if (!dup) newItems.push(n);
          }

          const items = [
            ...newItems,
            ...existing.map((item) => mergedExisting.get(item.id) || item),
          ]
            .filter((item) => isNotificationRecent(item.createdAt, nowTs, String(item.meta?.eventType || item.meta?.type || item.type || "")))
            .sort(
              (a, b) =>
                (Date.parse(b.createdAt) || 0) -
                (Date.parse(a.createdAt) || 0),
            )
            .slice(0, 100);
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      markAsRead: (id) =>
        set((state) => {
          const items = state.items.map((x) => (x.id === id ? { ...x, read: true } : x));
          const activeItems = items.filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")));
          const unread = activeItems.filter((x) => !x.read).length;
          return { items: activeItems, unread };
        }),

      markAllRead: () =>
        set((state) => {
          const items = state.items
            .filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")))
            .map((x) => ({ ...x, read: true }));
          return { items, unread: 0 };
        }),

      removeWhere: (predicate) =>
        set((state) => {
          const items = state.items.filter(
            (item) => isNotificationRecent(item.createdAt, undefined, String(item.meta?.eventType || item.meta?.type || item.type || "")) && !predicate(item),
          );
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      clearRead: () =>
        set((state) => {
          const items = state.items.filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")) && !x.read);
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      clear: () =>
        set(() => {
          // Also clear localStorage directly to ensure persistence
          try {
            localStorage.removeItem('app_notifications');
          } catch (e) {
            console.error('Failed to clear localStorage:', e);
          }
          return { items: [], unread: 0, toasted: {} };
        }),

      markToasted: (id) =>
        set((state) => {
          // Keep map from growing without bound: trim if too large
          const entries = Object.entries(state.toasted);
          const next: Record<string, true> = { ...state.toasted, [id]: true };
          if (entries.length > 300) {
            // Rebuild keeping only the newest 200 ids that still exist in items
            const existingIds = new Set(state.items.map((x) => x.id));
            const filtered = entries
              .filter(([k]) => existingIds.has(k))
              .slice(0, 200);
            const compact: Record<string, true> = {} as Record<string, true>;
            for (const [k] of filtered) compact[k] = true as const;
            compact[id] = true as const;
            return { toasted: compact };
          }
          return { toasted: next };
        }),

      isToasted: (id) => !!(typeof id === "string" && (id in (useNotificationStore.getState().toasted || {}))),
    }),
    {
      name: "app_notifications",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // small migrate to ensure unread recomputed
      migrate: (state: unknown) => {
        const s = state as { items?: AppNotification[]; unread?: number; toasted?: Record<string, true> } | undefined;
        if (s && Array.isArray(s.items)) {
          const items = s.items.filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")));
          const unread = items.filter((x) => !x.read).length;
          const toasted = s.toasted && typeof s.toasted === "object" ? s.toasted : {};
          return { items, unread, toasted };
        }
        return { items: [], unread: 0, toasted: {} };
      },
      partialize: (s) => {
        const items = s.items.filter((x) => isNotificationRecent(x.createdAt, undefined, String(x.meta?.eventType || x.meta?.type || x.type || "")));
        return { items, unread: items.filter((x) => !x.read).length, toasted: s.toasted };
      },
    }
  )
);

// Helpers to derive a route/href from a notification, ensuring userId is forwarded when present
const toStringQuery = (q: Record<string, string | number | boolean | null | undefined> | undefined) => {
  const out: Record<string, string> = {};
  if (!q) return out;
  for (const [k, v] of Object.entries(q)) {
    if (v === null || typeof v === "undefined") continue;
    out[k] = String(v);
  }
  return out;
};

export function getNotificationRoute(n: AppNotification): AppNotificationRoute | null {
  const meta = n.meta as AppNotificationMeta | undefined;
  const route = meta?.route;
  if (!route || !route.pathname) return null;
  const userId = meta.userId || meta.user?.id;
  const baseQuery = toStringQuery(route.query);
  const query = userId ? { ...baseQuery, userId } : baseQuery;
  return { pathname: route.pathname, query };
}

export function buildNotificationHref(n: AppNotification): string | null {
  const r = getNotificationRoute(n);
  if (!r) return null;
  const qs = new URLSearchParams(toStringQuery(r.query)).toString();
  return qs ? `${r.pathname}?${qs}` : r.pathname;
}
