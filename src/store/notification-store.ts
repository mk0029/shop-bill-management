import { create } from "zustand";

export type AppNotificationType = "billing" | "inventory" | "system" | "payment";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO string
  read?: boolean;
  meta?: Record<string, unknown>;
}

interface NotificationState {
  items: AppNotification[];
  unread: number;
  add: (n: Omit<AppNotification, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  addMany: (list: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,

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

  clear: () => set({ items: [], unread: 0 }),
}));
