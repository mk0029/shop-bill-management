import { create } from "zustand";
import type { ShopChatRoom, ShopChatMessage } from "@/lib/shop-chat/types";
import { cacheRooms, cacheRoom, cacheMessages, cacheMessage, getCachedRooms, getCachedMessages } from "@/lib/chat-cache";

interface ChatState {
  // Normalized rooms
  roomsById: Record<string, ShopChatRoom>;
  roomIds: string[];
  // Normalized messages per room
  messagesByRoomId: Record<string, ShopChatMessage[]>;
  // Pagination cursors
  roomCursor: string | null;
  hasMoreRooms: boolean;
  messageCursors: Record<string, string | null>;
  hasMoreMessages: Record<string, boolean>;
  // Loading states
  roomsLoading: boolean;
  messagesLoading: Record<string, boolean>;
  // Presence
  onlineUserIds: Set<string>;
  lastSeenByUser: Record<string, string>;
  typingByRoom: Record<string, string>;
  // Socket state
  connected: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
  setRooms: (rooms: ShopChatRoom[], cursor?: string | null, hasMore?: boolean) => void;
  appendRooms: (rooms: ShopChatRoom[], cursor?: string | null, hasMore?: boolean) => void;
  upsertRoom: (room: ShopChatRoom) => void;
  setRoomMessages: (roomId: string, messages: ShopChatMessage[], cursor?: string | null, hasMore?: boolean) => void;
  prependMessages: (roomId: string, messages: ShopChatMessage[], cursor?: string | null, hasMore?: boolean) => void;
  mergeMessage: (roomId: string, message: ShopChatMessage) => void;
  mergeMessages: (roomId: string, messages: ShopChatMessage[]) => void;
  setRoomsLoading: (loading: boolean) => void;
  setMessagesLoading: (roomId: string, loading: boolean) => void;
  setOnlineUsers: (ids: Set<string>) => void;
  setLastSeen: (data: Record<string, string>) => void;
  setTyping: (roomId: string, text: string) => void;
  clearTyping: (roomId: string) => void;
  clearRoom: (roomId: string) => void;
  markRoomSeen: (roomId: string, userId: string) => void;
  getUnreadCount: (userId: string) => number;

  // Cache persistence
  persistToCache: () => Promise<void>;
  loadFromCache: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  roomsById: {},
  roomIds: [],
  messagesByRoomId: {},
  roomCursor: null,
  hasMoreRooms: true,
  messageCursors: {},
  hasMoreMessages: {},
  roomsLoading: false,
  messagesLoading: {},
  onlineUserIds: new Set(),
  lastSeenByUser: {},
  typingByRoom: {},
  connected: false,

  setConnected: (connected) => set({ connected }),

  setRooms: (rooms, cursor = null, hasMore = true) => {
    const roomsById: Record<string, ShopChatRoom> = {};
    const roomIds: string[] = [];
    for (const room of rooms) {
      roomsById[room.roomId] = room;
      roomIds.push(room.roomId);
    }
    set({ roomsById, roomIds, roomCursor: cursor, hasMoreRooms: hasMore });
  },

  appendRooms: (rooms, cursor = null, hasMore = true) => {
    set((state) => {
      const roomsById = { ...state.roomsById };
      const roomIds = [...state.roomIds];
      for (const room of rooms) {
        if (!roomsById[room.roomId]) {
          roomsById[room.roomId] = room;
          roomIds.push(room.roomId);
        }
      }
      return { roomsById, roomIds, roomCursor: cursor, hasMoreRooms: hasMore };
    });
  },

  upsertRoom: (room) => {
    set((state) => {
      const roomsById = { ...state.roomsById };
      const exists = !!roomsById[room.roomId];
      roomsById[room.roomId] = room;
      const roomIds = exists
        ? state.roomIds
        : [room.roomId, ...state.roomIds];
      // Re-sort
      roomIds.sort((a, b) => {
        const ra = roomsById[a];
        const rb = roomsById[b];
        const ta = ra.lastMessage?.createdAt || ra.updatedAt || ra.createdAt;
        const tb = rb.lastMessage?.createdAt || rb.updatedAt || rb.createdAt;
        return Date.parse(tb) - Date.parse(ta);
      });
      return { roomsById, roomIds };
    });
    // Persist to cache
    cacheRoom(room);
  },

  setRoomMessages: (roomId, messages, cursor = null, hasMore = true) => {
    set((state) => ({
      messagesByRoomId: { ...state.messagesByRoomId, [roomId]: messages },
      messageCursors: { ...state.messageCursors, [roomId]: cursor },
      hasMoreMessages: { ...state.hasMoreMessages, [roomId]: hasMore },
    }));
    cacheMessages(roomId, messages);
  },

  prependMessages: (roomId, messages, cursor = null, hasMore = true) => {
    set((state) => {
      const existing = state.messagesByRoomId[roomId] || [];
      const existingIds = new Set(existing.map((m) => m.messageId));
      const newMsgs = messages.filter((m) => !existingIds.has(m.messageId));
      return {
        messagesByRoomId: {
          ...state.messagesByRoomId,
          [roomId]: [...newMsgs, ...existing],
        },
        messageCursors: { ...state.messageCursors, [roomId]: cursor },
        hasMoreMessages: { ...state.hasMoreMessages, [roomId]: hasMore },
      };
    });
  },

  mergeMessage: (roomId, message) => {
    set((state) => {
      const existing = state.messagesByRoomId[roomId] || [];
      const clientId = message.clientMessageId;
      const billEventId = billEventKey(message);
      const idx = existing.findIndex(
        (m) =>
          m.messageId === message.messageId ||
          (clientId && m.clientMessageId === clientId) ||
          (billEventId && billEventKey(m) === billEventId),
      );
      let next: ShopChatMessage[];
      if (idx >= 0) {
        next = [...existing];
        next[idx] = { ...next[idx], ...message };
      } else {
        next = [...existing, message].sort(
          (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
        );
      }
      return {
        messagesByRoomId: { ...state.messagesByRoomId, [roomId]: next },
      };
    });
    cacheMessage(message);
  },

  mergeMessages: (roomId, messages) => {
    set((state) => {
      const existing = state.messagesByRoomId[roomId] || [];
      const existingIds = new Set(existing.map((m) => m.messageId));
      let next = [...existing];
      for (const msg of messages) {
        if (existingIds.has(msg.messageId)) {
          const idx = next.findIndex((m) => m.messageId === msg.messageId);
          if (idx >= 0) next[idx] = { ...next[idx], ...msg };
        } else {
          next.push(msg);
        }
      }
      next.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      return {
        messagesByRoomId: { ...state.messagesByRoomId, [roomId]: next },
      };
    });
    cacheMessages(roomId, messages);
  },

  setRoomsLoading: (loading) => set({ roomsLoading: loading }),
  setMessagesLoading: (roomId, loading) =>
    set((state) => ({ messagesLoading: { ...state.messagesLoading, [roomId]: loading } })),
  setOnlineUsers: (ids) => set({ onlineUserIds: ids }),
  setLastSeen: (data) => set((state) => ({ lastSeenByUser: { ...state.lastSeenByUser, ...data } })),
  setTyping: (roomId, text) =>
    set((state) => ({ typingByRoom: { ...state.typingByRoom, [roomId]: text } })),
  clearTyping: (roomId) =>
    set((state) => {
      const next = { ...state.typingByRoom };
      delete next[roomId];
      return { typingByRoom: next };
    }),

  clearRoom: (roomId) => {
    set((state) => {
      const roomsById = { ...state.roomsById };
      delete roomsById[roomId];
      const messagesByRoomId = { ...state.messagesByRoomId };
      delete messagesByRoomId[roomId];
      const messageCursors = { ...state.messageCursors };
      delete messageCursors[roomId];
      const hasMoreMessages = { ...state.hasMoreMessages };
      delete hasMoreMessages[roomId];
      return {
        roomsById,
        roomIds: state.roomIds.filter((id) => id !== roomId),
        messagesByRoomId,
        messageCursors,
        hasMoreMessages,
      };
    });
  },

  markRoomSeen: (roomId, userId) => {
    set((state) => {
      const room = state.roomsById[roomId];
      if (!room) return state;
      return {
        roomsById: {
          ...state.roomsById,
          [roomId]: {
            ...room,
            unreadBy: { ...room.unreadBy, [userId]: 0 },
          },
        },
      };
    });
  },

  getUnreadCount: (userId) => {
    const state = get();
    return Object.values(state.roomsById).reduce(
      (sum, room) => sum + Number(room.unreadBy?.[userId] || 0),
      0,
    );
  },

  persistToCache: async () => {
    const state = get();
    const rooms = Object.values(state.roomsById);
    await cacheRooms(rooms);
    for (const [roomId, messages] of Object.entries(state.messagesByRoomId)) {
      await cacheMessages(roomId, messages);
    }
  },

  loadFromCache: async () => {
    const rooms = await getCachedRooms();
    if (rooms.length > 0) {
      const roomsById: Record<string, ShopChatRoom> = {};
      const roomIds: string[] = [];
      for (const room of rooms) {
        roomsById[room.roomId] = room;
        roomIds.push(room.roomId);
      }
      set({ roomsById, roomIds });
    }
  },
}));

function billEventKey(message: ShopChatMessage): string {
  const eventType = String(message.systemEventType || message.systemEventData?.eventType || "");
  const clientMessageId = String(message.clientMessageId || "");
  if (eventType !== "bill_created" && !clientMessageId.startsWith("event:bill_created:")) return "";
  const billId = String(message.systemEventData?.billId || "").trim();
  return billId || clientMessageId.replace("event:bill_created:", "").trim();
}
