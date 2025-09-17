import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatRoom, ChatMessage } from "@/lib/chat-api";
import { getOrCreateRoomByCustomer, listRooms, listRoomMessages, sendRoomMessage, markRoomRead, markMessageSeen, updateMessage } from "@/lib/chat-api";
import { getTokenWithoutRegister } from "@/lib/fcm-client";
import { setupRealtimeListeners } from "@/lib/sanity";
import { cacheGetRooms, cacheSetRooms, cacheGetMessages, cacheSetMessages, cacheMergeAndSetMessages } from "@/lib/chat-cache";
import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";

interface ChatState {
  rooms: ChatRoom[];
  messagesByRoomId: Record<string, ChatMessage[]>;
  // Per-room simple FIFO queue for outgoing messages to preserve order and avoid duplicate optimistics
  _sendQueueByRoomId: Record<string, Array<{ 
    tempId: string; 
    content: string; 
    senderId: string; 
    isCustomer?: boolean; 
    parentId?: string;
    parentMessage?: {
      _id: string;
      content: string;
      sender?: { _id: string; name?: string } | { _ref: string };
    };
  }>>;
  _sendingBusyByRoomId: Record<string, boolean>;
  activeRoomId: string | null;
  isLoading: boolean;
  error: string | null;

  loadRooms: (opts?: { customerId?: string; adminId?: string }) => Promise<void>;
  openRoomByCustomer: (customerId: string) => Promise<string>; // returns roomId
  setActiveRoom: (roomId: string) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (
    roomId: string, 
    content: string, 
    senderId: string, 
    isCustomer?: boolean, 
    parentId?: string,
    parentMessage?: { _id: string; content: string; sender?: { _id: string; name?: string } | { _ref: string } }
  ) => Promise<void>;
  markRead: (roomId: string, actor: "admin" | "customer") => Promise<void>;
  markMessageSeen: (roomId: string, messageId: string) => Promise<void>;
  editMessage: (roomId: string, messageId: string, content: string) => Promise<void>;

  // realtime sub
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
  _subscription: { unsubscribe: () => void } | null;
  _processQueue: (roomId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(devtools((set, get) => ({
  rooms: [],
  messagesByRoomId: {},
  _sendQueueByRoomId: {},
  _sendingBusyByRoomId: {},
  activeRoomId: null,
  isLoading: false,
  error: null,
  _subscription: null,

  loadRooms: async (opts) => {
    set({ isLoading: true, error: null });
    try {
      // Load cached rooms first for instant UI
      try {
        const cached = await cacheGetRooms();
        if (cached && Array.isArray(cached) && cached.length >= 0) {
          set({ rooms: cached });
        }
      } catch {}

      const rooms = await listRooms({ customerId: opts?.customerId, adminId: opts?.adminId });
      set({ rooms, isLoading: false });
      // Persist to cache
      try { await cacheSetRooms(rooms); } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load rooms";
      set({ error: msg, isLoading: false });
    }
  },

  // Internal: processes the outgoing message queue per room
  _processQueue: async (roomId: string) => {
    const state = get();
    if (state._sendingBusyByRoomId[roomId]) return;
    const q = state._sendQueueByRoomId[roomId] || [];
    if (q.length === 0) return;
    set((s) => ({ _sendingBusyByRoomId: { ...s._sendingBusyByRoomId, [roomId]: true } }));
    try {
      while (true) {
        const { _sendQueueByRoomId } = get();
        const queue = _sendQueueByRoomId[roomId] || [];
        if (queue.length === 0) break;
        const item = queue[0];
        // Try to fetch current device token to exclude from push targets
        let senderToken: string | null = null;
        try { senderToken = await getTokenWithoutRegister(); } catch {}
        try {
          const saved = await sendRoomMessage({ 
            roomId, 
            content: item.content, 
            senderId: item.senderId, 
            isCustomer: item.isCustomer, 
            parentId: item.parentId,
            parentMessage: item.parentMessage,
            senderToken 
          });
          // Replace the optimistic tempId with saved message
          set((s) => {
            const list = s.messagesByRoomId[roomId] || [];
            // Replace the temp message if present; otherwise, ensure the saved message exists once.
            const mapped = list.map((m) => {
              if (m._id === item.tempId) {
                return saved;
              }
              return m;
            });
            const hasSaved = mapped.some((m) => m._id === saved._id);
            const nextRaw = hasSaved ? mapped : [...mapped, saved];
            // Dedupe by _id just in case concurrent realtime already merged
            const seen: Record<string, ChatMessage> = {};
            for (const m of nextRaw) { seen[m._id] = m; }
            const next = Object.values(seen);
            const restQueue = (s._sendQueueByRoomId[roomId] || []).slice(1);
            return {
              messagesByRoomId: { ...s.messagesByRoomId, [roomId]: next },
              _sendQueueByRoomId: { ...s._sendQueueByRoomId, [roomId]: restQueue },
            };
          });
          try {
            const current = get().messagesByRoomId[roomId] || [];
            await cacheSetMessages(roomId, current);
          } catch {}
        } catch (e: unknown) {
          // On failure, drop from queue but keep optimistic as 'pending' (could add retry/backoff if needed)
          set((s) => ({ _sendQueueByRoomId: { ...s._sendQueueByRoomId, [roomId]: (s._sendQueueByRoomId[roomId] || []).slice(1) } }));
          const msg = e instanceof Error ? e.message : 'Failed to send message';
          set({ error: msg });
        }
      }
    } finally {
      set((s) => ({ _sendingBusyByRoomId: { ...s._sendingBusyByRoomId, [roomId]: false } }));
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
    // persist to cache optimistically
    try {
      await cacheMergeAndSetMessages(roomId, (prev) => prev.map((m) => m._id === messageId ? { ...m, status: 'seen', seenAt: now, updatedAt: now } as ChatMessage : m));
    } catch {}
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
      // Show cached messages immediately if available
      try {
        const cached = await cacheGetMessages(roomId);
        if (cached && Array.isArray(cached)) {
          set((s) => ({ messagesByRoomId: { ...s.messagesByRoomId, [roomId]: cached } }));
        }
      } catch {}

      const msgs = await listRoomMessages(roomId, 100);
      set((s) => ({ messagesByRoomId: { ...s.messagesByRoomId, [roomId]: msgs } }));
      try { await cacheSetMessages(roomId, msgs); } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load messages";
      set({ error: msg });
    }
  },

  sendMessage: async (roomId, content, senderId, isCustomer, parentId, parentMessage) => {
    // Enqueue request to preserve order and avoid duplicates during realtime roundtrip
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      _id: tempId,
      room: { _ref: roomId },
      sender: { _ref: senderId },
      content,
      attachments: [],
      status: "pending",
      parentId,
      parentMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => {
      const list = s.messagesByRoomId[roomId] || [];
      const q = s._sendQueueByRoomId[roomId] || [];
      return {
        messagesByRoomId: { ...s.messagesByRoomId, [roomId]: [...list, optimistic] },
        _sendQueueByRoomId: { 
          ...s._sendQueueByRoomId, 
          [roomId]: [...q, { 
            tempId, 
            content, 
            senderId, 
            isCustomer, 
            parentId,
            parentMessage // Include parentMessage in the queue
          }] 
        },
      };
    });
    try { await cacheMergeAndSetMessages(roomId, (prev) => [...prev.filter((m) => m._id !== tempId), optimistic]); } catch {}
    // Kick the processor
    await get()._processQueue(roomId);
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
    try { await cacheMergeAndSetMessages(roomId, (prev) => prev.map((m) => m._id === messageId ? { ...m, content, editedAt: now, updatedAt: now } as ChatMessage : m)); } catch {}
    try {
      const saved = await updateMessage({ messageId, content });
      set((s) => ({
        messagesByRoomId: {
          ...s.messagesByRoomId,
          [roomId]: (s.messagesByRoomId[roomId] || []).map((m) => m._id === messageId ? saved : m),
        },
      }));
      try { await cacheMergeAndSetMessages(roomId, (prev) => prev.map((m) => m._id === messageId ? saved : m)); } catch {}
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
            // Try to reconcile with any optimistic pending item to avoid duplicates
            const sender = (msg?.sender as { _id?: string; _ref?: string } | undefined);
            const senderId = sender?._id || sender?._ref;
            const matchIdxByPending = list.findIndex((m) => {
              if (!m || m._id.startsWith?.('temp_') === false) return false;
              const ms = Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime());
              const mSender = (m?.sender as { _id?: string; _ref?: string } | undefined);
              const mSenderId = mSender?._id || mSender?._ref;
              return m.status === 'pending' && m.content === msg.content && mSenderId === senderId && ms <= 10_000;
            });
            const next = [...list];
            const existingIdx = next.findIndex((m) => m._id === msg._id);
            if (existingIdx >= 0) {
              next[existingIdx] = msg;
            } else if (matchIdxByPending >= 0) {
              next[matchIdxByPending] = msg; // replace the optimistic one
            } else {
              next.push(msg);
            }
            // Dedupe by _id to avoid accidental duplicates
            const seen: Record<string, ChatMessage> = {};
            for (const m of next) { seen[m._id] = m; }
            const deduped = Object.values(seen);
            return { messagesByRoomId: { ...s.messagesByRoomId, [roomRef]: deduped } };
          });
          // persist updated list to cache
          try {
            const current = get().messagesByRoomId[roomRef] || [];
            const idx = current.findIndex((m) => m._id === msg._id);
            const updated = [...current];
            if (idx >= 0) updated[idx] = msg; else updated.push(msg);
            void cacheSetMessages(roomRef, updated);
          } catch {}

          // In-app notification logic for chat messages
          try {
            const add = useNotificationStore.getState().add;
            // Determine if we should suppress based on current route and active room
            const active = get().activeRoomId;
            const loc = typeof window !== 'undefined' ? window.location : null;
            const pathname = loc ? loc.pathname : '';
            const onChatRoute = pathname.startsWith('/admin/chats') || pathname.startsWith('/customer/chat');
            // Suppress if the message is from the current user (self)
            try {
              const auth = useAuthStore.getState();
              const me = (auth?.user as { id?: string; _id?: string } | null) || null;
              const myId: string | undefined = me?._id || me?.id;
              const sender = (msg?.sender as { _id?: string; _ref?: string } | undefined);
              const senderId = sender?._id || sender?._ref;
              if (myId && senderId && myId === senderId) {
                // own message; don't notify
                return;
              }
            } catch {}
            // Fallback to URL param if activeRoomId not yet set
            let currentRoomId = active || null;
            try {
              if (!currentRoomId && loc) {
                const here = new URL(loc.href);
                const q = here.searchParams.get('roomId');
                if (q) currentRoomId = q;
              }
            } catch {}
            const isSameRoomOpen = !!currentRoomId && currentRoomId === roomRef && onChatRoute;
            if (isSameRoomOpen) {
              // Do not show in-app notification if user is already on this chat
              return;
            }

            // Build human label from rooms
            let label = 'Chat';
            try {
              const r = get().rooms.find((x) => x._id === roomRef);
              label = (r?.customer?.name || r?.roomName || 'Chat') as string;
            } catch {}
            const preview = (msg.content || '').toString().slice(0, 120);

            // Determine target route depending on portal
            const isAdmin = pathname.startsWith('/admin');
            const routePath = isAdmin ? '/admin/chats' : '/customer/chat';

            add({
              type: 'chat',
              title: `${label}`,
              body: preview || 'New message',
              meta: {
                route: { pathname: routePath, query: { roomId: roomRef } },
              },
            });
          } catch {}
        } else {
          // Some updates (like read/delivery status) may not include result; avoid refetching to prevent flashes/removals
          return;
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

