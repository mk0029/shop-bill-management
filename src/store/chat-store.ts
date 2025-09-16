import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatRoom, ChatMessage } from "@/lib/chat-api";
import { getOrCreateRoomByCustomer, listRooms, listRoomMessages, sendRoomMessage, markRoomRead, markMessageSeen, updateMessage } from "@/lib/chat-api";
import { setupRealtimeListeners } from "@/lib/sanity";

interface ChatState {
  rooms: ChatRoom[];
  messagesByRoomId: Record<string, ChatMessage[]>;
  activeRoomId: string | null;
  isLoading: boolean;
  error: string | null;

  loadRooms: (opts?: { customerId?: string; adminId?: string }) => Promise<void>;
  openRoomByCustomer: (customerId: string) => Promise<string>; // returns roomId
  setActiveRoom: (roomId: string) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, senderId: string, isCustomer?: boolean, parentId?: string) => Promise<void>;
  markRead: (roomId: string, actor: "admin" | "customer") => Promise<void>;
  markMessageSeen: (roomId: string, messageId: string) => Promise<void>;
  editMessage: (roomId: string, messageId: string, content: string) => Promise<void>;

  // realtime sub
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
  _subscription: { unsubscribe: () => void } | null;
}

export const useChatStore = create<ChatState>()(devtools((set, get) => ({
  rooms: [],
  messagesByRoomId: {},
  activeRoomId: null,
  isLoading: false,
  error: null,
  _subscription: null,

  loadRooms: async (opts) => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await listRooms({ customerId: opts?.customerId, adminId: opts?.adminId });
      set({ rooms, isLoading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load rooms";
      set({ error: msg, isLoading: false });
    }
  },

  markMessageSeen: async (roomId, messageId) => {
    const state = get();
    const list = state.messagesByRoomId[roomId] || [];
    const exists = list.find((m) => m._id === messageId);
    if (!exists) return;
    if (exists.status === 'seen' && exists.seenAt) return;
    // optimistic update
    const now = new Date().toISOString();
    set((s) => ({
      messagesByRoomId: {
        ...s.messagesByRoomId,
        [roomId]: (s.messagesByRoomId[roomId] || []).map((m) => m._id === messageId ? { ...m, status: 'seen', seenAt: now, updatedAt: now } : m),
      },
    }));
    try {
      await markMessageSeen(messageId);
    } catch {
      // ignore failures; will be corrected by realtime or on next fetch
    }
  },

  openRoomByCustomer: async (customerId) => {
    const room = await getOrCreateRoomByCustomer(customerId);
    set((s) => {
      const exists = s.rooms.find((r) => r._id === room._id);
      return { rooms: exists ? s.rooms.map((r) => (r._id === room._id ? room : r)) : [room, ...s.rooms] };
    });
    return room._id;
  },

  setActiveRoom: async (roomId) => {
    set({ activeRoomId: roomId });
    // mark read for admin by default when viewing
    try { await get().markRead(roomId, "admin"); } catch {}
    await get().fetchMessages(roomId);
  },

  fetchMessages: async (roomId) => {
    try {
      const msgs = await listRoomMessages(roomId, 100);
      set((s) => ({ messagesByRoomId: { ...s.messagesByRoomId, [roomId]: msgs } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load messages";
      set({ error: msg });
    }
  },

  sendMessage: async (roomId, content, senderId, isCustomer, parentId) => {
    // optimistic
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      _id: localId,
      room: { _ref: roomId },
      sender: { _ref: senderId },
      content,
      attachments: [],
      status: "sent",
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => {
      const list = s.messagesByRoomId[roomId] || [];
      return { messagesByRoomId: { ...s.messagesByRoomId, [roomId]: [...list, optimistic] } };
    });

    try {
      const saved = await sendRoomMessage({ roomId, content, senderId, isCustomer, parentId });
      set((s) => {
        // Remove optimistic and also any existing item with same _id to prevent duplicates
        const list = (s.messagesByRoomId[roomId] || [])
          .filter((m) => m._id !== localId)
          .filter((m) => m._id !== saved._id);
        return { messagesByRoomId: { ...s.messagesByRoomId, [roomId]: [...list, saved] } };
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send message";
      set({ error: msg });
    }
  },

  markRead: async (roomId, actor) => {
    try {
      await markRoomRead(roomId, actor);
      // reset local counters in rooms array
      set((s) => ({
        rooms: s.rooms.map((r) => r._id === roomId ? ({
          ...r,
          unreadForAdmins: actor === 'admin' ? 0 : r.unreadForAdmins,
          unreadForCustomer: actor === 'customer' ? 0 : r.unreadForCustomer,
        }) : r),
      }));
    } catch {}
  },

  editMessage: async (roomId, messageId, content) => {
    const now = new Date().toISOString();
    // optimistic update
    set((s) => ({
      messagesByRoomId: {
        ...s.messagesByRoomId,
        [roomId]: (s.messagesByRoomId[roomId] || []).map((m) => m._id === messageId ? { ...m, content, editedAt: now, updatedAt: now } : m),
      },
    }));
    try {
      const saved = await updateMessage({ messageId, content });
      set((s) => ({
        messagesByRoomId: {
          ...s.messagesByRoomId,
          [roomId]: (s.messagesByRoomId[roomId] || []).map((m) => m._id === messageId ? saved : m),
        },
      }));
    } catch (e: unknown) {
      // On failure, refetch to ensure consistency
      try { await get().fetchMessages(roomId); } catch {}
      const msg = e instanceof Error ? e.message : "Failed to update message";
      set({ error: msg });
    }
  },

  subscribeRealtime: () => {
    if (get()._subscription) return;
    const sub = setupRealtimeListeners((update: unknown) => {
      // Narrow known shape from Sanity
      const u = update as { result?: { _type?: string; _id?: string; room?: { _ref?: string } | string }; documentId?: string } | undefined;
      const docType = u?.result?._type || u?.documentId?.split(".")[0];
      if (!docType) return;
      if (docType === 'chatRoom') {
        // refresh rooms list on changes
        get().loadRooms().catch(() => {});
      } else if (docType === 'chatMessage') {
        const msg = u?.result as ChatMessage | undefined;
        const roomRef = (msg?.room as { _ref?: string } | string | undefined && (typeof msg?.room === 'string' ? msg?.room : (msg?.room as { _ref?: string })?._ref));
        if (msg && roomRef) {
          set((s) => {
            const list = s.messagesByRoomId[roomRef] || [];
            const idx = list.findIndex((m) => m._id === msg._id);
            const next = [...list];
            if (idx >= 0) next[idx] = msg; else next.push(msg);
            return { messagesByRoomId: { ...s.messagesByRoomId, [roomRef]: next } };
          });
        } else {
          // If we didn't get the full doc (e.g., delete/mutation without result), ensure active room is refreshed
          const active = get().activeRoomId;
          if (active) {
            get().fetchMessages(active).catch(() => {});
          }
        }
      }
    });
    set({ _subscription: sub });
  },

  unsubscribeRealtime: () => {
    const sub = get()._subscription;
    if (sub) try { sub.unsubscribe(); } catch {}
    set({ _subscription: null });
  },
})));

