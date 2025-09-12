import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppNotificationType = "billing" | "inventory" | "system" | "payment";

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
  clear: () => void;
  // Mark a notification as having been shown as a toast
  markToasted: (id: string) => void;
  // Check if a notification has already been shown as a toast
  isToasted: (id: string) => boolean;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      unread: 0,
      toasted: {},

      add: (n) =>
        set((state) => {
          const item: AppNotification = {
            id: n.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: n.createdAt || new Date().toISOString(),
            read: false,
            ...n,
          };
          const items = [item, ...state.items].slice(0, 100); // cap to 100
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      addMany: (list) =>
        set((state) => {
          const items = [...list, ...state.items].slice(0, 100);
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      markAsRead: (id) =>
        set((state) => {
          const items = state.items.map((x) => (x.id === id ? { ...x, read: true } : x));
          const unread = items.filter((x) => !x.read).length;
          return { items, unread };
        }),

      markAllRead: () =>
        set((state) => {
          const items = state.items.map((x) => ({ ...x, read: true }));
          return { items, unread: 0 };
        }),

      clear: () => set({ items: [], unread: 0, toasted: {} }),

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
            return { toasted: compact } as Partial<NotificationState>;
          }
          return { toasted: next } as Partial<NotificationState>;
        }),

      isToasted: (id) => !!(typeof id === "string" && (id in (useNotificationStore.getState().toasted || {}))),
    }),
    {
      name: "app_notifications",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // small migrate to ensure unread recomputed
      migrate: (state: unknown) => {
        const s = state as { items?: AppNotification[]; unread?: number; toasted?: Record<string, true> } | undefined;
        if (s && Array.isArray(s.items)) {
          const unread = s.items.filter((x) => !x.read).length;
          const toasted = s.toasted && typeof s.toasted === "object" ? s.toasted : {};
          return { ...s, unread, toasted } as unknown;
        }
        return state;
      },
      partialize: (s) => ({ items: s.items, unread: s.unread, toasted: s.toasted }),
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
