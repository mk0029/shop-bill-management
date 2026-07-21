"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyShopChatRoom, listShopChatRooms } from "./api";
import { useShopChatSocket } from "./socket";
import type { ShopChatMessage, ShopChatRoom } from "./types";
import { useNotificationStore } from "@/store/notification-store";
import { useChatStore } from "@/store/chat-store";
import {
  clearAppSystemNotifications,
  getActiveChatId,
  markNotificationHandled,
  wasNotificationHandled,
} from "@/lib/notifications/dedupe";
import { safeUserName } from "@/lib/display-text";

function isSupportRole(role?: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function isSystemLastMessage(room: ShopChatRoom): boolean {
  return Boolean(room.lastMessage?.systemEventType);
}

function sanitizeAdminUnread(room: ShopChatRoom, userId: string): ShopChatRoom {
  if (room.unreadBy?.[userId] && room.unreadBy[userId] > 0 && isSystemLastMessage(room)) {
    return { ...room, unreadBy: { ...room.unreadBy, [userId]: 0 } };
  }
  return room;
}

function adminUnreadCount(room: ShopChatRoom, userId: string): number {
  return Number(room.customerUnreadBy?.[userId] || 0);
}

function sanitizeAdminUnreadCount(rooms: ShopChatRoom[], userId: string): number {
  return rooms.reduce((sum, room) => {
    return sum + adminUnreadCount(room, userId);
  }, 0);
}

function messageTypeLabel(type?: ShopChatMessage["type"] | string | null) {
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  if (type === "image") return "image";
  if (type === "file") return "file";
  if (type && type !== "text") return "media";
  return "message";
}

function messageTypePhrase(type?: ShopChatMessage["type"] | string | null) {
  const label = messageTypeLabel(type);
  return label === "audio" || label === "image" ? `an ${label}` : `a ${label}`;
}

function messagePreview(last: NonNullable<ShopChatRoom["lastMessage"]>) {
  const text = String(last.text || "").trim();
  if (last.type === "text") return text || "Open chat to reply";
  const prefix = `Sent ${messageTypePhrase(last.type)}`;
  return text ? `${prefix}: ${text}` : prefix;
}

function chatNotificationId(messageId: string) {
  return `shop-chat:${messageId}`;
}

function ownActionActorId(last: NonNullable<ShopChatRoom["lastMessage"]>) {
  const data = last.systemEventData;
  if (!data || typeof data !== "object") return "";
  const candidates = [data.actorUserId, data.createdById, data.updatedById, data.clearedById];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }
  return "";
}

export function useGlobalShopChat(
  user?: { id?: string; _id?: string; role?: string | null } | null,
) {
  const pathname = usePathname() || "";
  const userId = String(user?.id || user?._id || "");
  const role = String(user?.role || "");
  const enabled = Boolean(userId && (isSupportRole(role) || role === "customer"));
  const { socket, connected } = useShopChatSocket(undefined, enabled);
  const chatStore = useChatStore();
  const [localRooms, setLocalRooms] = useState<ShopChatRoom[]>([]);
  const notifiedMessageIdsRef = useRef(new Set<string>());
  const chatPath = role === "customer" ? "/customer/chat" : "/admin/chat";
  const isChatRoute = pathname === "/chat" || pathname === chatPath || pathname.startsWith(`${chatPath}/`);

  // Derive sorted rooms from store
  const rooms = useMemo(() => {
    const ids = chatStore.roomIds;
    const byId = chatStore.roomsById;
    if (ids.length === 0) return localRooms;
    return ids.map((id) => byId[id]).filter(Boolean);
  }, [chatStore.roomIds, chatStore.roomsById, localRooms]);

  const upsertRoom = useCallback((room: ShopChatRoom) => {
    chatStore.upsertRoom(room);
    setLocalRooms((prev) => {
      const exists = prev.some((item) => item.roomId === room.roomId);
      const next = exists ? prev.map((item) => (item.roomId === room.roomId ? room : item)) : [room, ...prev];
      return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    });
  }, [chatStore]);

  const maybeNotifyFromRoom = useCallback(
    (room: ShopChatRoom) => {
      const sanitized = isSupportRole(role) ? sanitizeAdminUnread(room, userId) : room;
      const last = role === "admin" ? (sanitized.lastCustomerMessage || sanitized.lastMessage) : sanitized.lastMessage;
      if (!last) return;

      const unreadCount = isSupportRole(role) ? adminUnreadCount(sanitized, userId) : Number(sanitized.unreadBy?.[userId] || 0);
      if (unreadCount <= 0) {
        useNotificationStore.getState().removeWhere((n) => n.meta?.type === "shop_chat" && n.meta?.roomId === sanitized.roomId);
        clearAppSystemNotifications({ roomId: sanitized.roomId });
      }

      const previous = (chatStore.roomsById[sanitized.roomId] || localRooms.find((r) => r.roomId === sanitized.roomId));
      if (previous?.lastMessage?.messageId === last.messageId) return;

      const activeChatId = getActiveChatId();
      if (activeChatId === sanitized.roomId) {
        markNotificationHandled(last.messageId);
        clearAppSystemNotifications({ roomId: sanitized.roomId });
        return;
      }

      const actorUserId = ownActionActorId(last);
      const isOwnMessage = last.senderId === userId || actorUserId === userId;

      if (!isChatRoute && !isOwnMessage) {
        if (wasNotificationHandled(last.messageId) || wasNotificationHandled(chatNotificationId(last.messageId))) return;
        if (notifiedMessageIdsRef.current.has(last.messageId)) return;
        notifiedMessageIdsRef.current.add(last.messageId);
        const senderName = safeUserName(last.senderName, "Someone");

        useNotificationStore.getState().add({
          id: chatNotificationId(last.messageId),
          type: "chat",
          title: `${senderName} sent ${messageTypePhrase(last.type)}`,
          body: messagePreview(last),
          createdAt: last.createdAt,
          meta: {
            type: "shop_chat",
            roomId: sanitized.roomId,
            messageId: last.messageId,
            messageType: last.type,
            senderName,
            actorUserId: actorUserId || undefined,
            userId: role === "customer" ? userId : sanitized.customerId,
            route: { pathname: chatPath, query: role === "customer" ? undefined : { customerId: sanitized.customerId } },
          },
        });
      }
    },
    [chatPath, chatStore.roomsById, isChatRoute, localRooms, role, userId],
  );

  const clearChatRoomNotifications = useCallback((roomId?: string | null) => {
    useNotificationStore.getState().removeWhere((notification) => {
      if (notification.type !== "chat" && notification.meta?.type !== "shop_chat") return false;
      if (!roomId) return true;
      return String(notification.meta?.roomId || "") === roomId;
    });
    if (roomId) clearAppSystemNotifications({ roomId });
    else clearAppSystemNotifications();
  }, []);

  const clearSeenRoomNotifications = useCallback(
    (room: ShopChatRoom) => {
      const lastMessageId = (role === "admin" ? (room.lastCustomerMessage || room.lastMessage) : room.lastMessage)?.messageId;
      if (lastMessageId) {
        markNotificationHandled(lastMessageId);
        markNotificationHandled(chatNotificationId(lastMessageId));
      }
      clearChatRoomNotifications(room.roomId);
    },
    [clearChatRoomNotifications, role],
  );

  const markRoomSeenLocally = useCallback(
    (room: ShopChatRoom) => ({
      ...room,
      unreadBy: { ...(room.unreadBy || {}), ...(userId ? { [userId]: 0 } : {}) },
      customerUnreadBy: { ...(room.customerUnreadBy || {}), ...(userId ? { [userId]: 0 } : {}) },
    }),
    [userId],
  );

  // Initial load: try cache first, then network
  useEffect(() => {
    if (!enabled) {
      setLocalRooms([]);
      return;
    }

    const adminMode = isSupportRole(role);
    let cancelled = false;
    async function loadInitial() {
      try {
        // Load from cache first for instant display
        await chatStore.loadFromCache();

        // Sanitize cached rooms for admin users
        if (adminMode) {
          const cached = Object.values(chatStore.roomsById);
          for (const room of cached) {
            const sanitized = sanitizeAdminUnread(room, userId);
            if (sanitized !== room) chatStore.upsertRoom(sanitized);
          }
        }

        // Then fetch from network
        if (adminMode) {
          const response = await listShopChatRooms({ limit: 0 });
          if (!cancelled) {
            const rooms = (isChatRoute ? response.rooms.map(markRoomSeenLocally) : response.rooms)
              .map((r) => sanitizeAdminUnread(r, userId));
            chatStore.setRooms(rooms, response.nextCursor, response.hasMore);
            setLocalRooms(rooms);
            if (isChatRoute) rooms.forEach(clearSeenRoomNotifications);
          }
        } else if (role === "customer") {
          const response = await getMyShopChatRoom();
          if (!cancelled) {
            const room = isChatRoute ? markRoomSeenLocally(response.room) : response.room;
            chatStore.setRooms([room]);
            setLocalRooms([room]);
            if (isChatRoute) clearSeenRoomNotifications(response.room);
          }
        }
      } catch {
        // Cache data already rendered
      }
    }
    void loadInitial();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, role, isChatRoute]);

  // Socket room updates
  useEffect(() => {
    if (!socket || !enabled) return;
    const adminMode = isSupportRole(role);
    const onRoomUpdated = (room: ShopChatRoom) => {
      const sanitized = adminMode ? sanitizeAdminUnread(room, userId) : room;
      if (isChatRoute) {
        clearSeenRoomNotifications(sanitized);
        upsertRoom(markRoomSeenLocally(sanitized));
        return;
      }
      maybeNotifyFromRoom(sanitized);
      upsertRoom(sanitized);
    };
    const onRoomJoined = ({ room }: { room: ShopChatRoom }) => {
      const sanitized = adminMode ? sanitizeAdminUnread(room, userId) : room;
      if (isChatRoute) clearSeenRoomNotifications(sanitized);
      upsertRoom(isChatRoute ? markRoomSeenLocally(sanitized) : sanitized);
    };
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:joined", onRoomJoined);
    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:joined", onRoomJoined);
    };
  }, [clearSeenRoomNotifications, enabled, isChatRoute, markRoomSeenLocally, maybeNotifyFromRoom, role, socket, upsertRoom, userId]);

  // Clear notifications when on chat route
  useEffect(() => {
    if (!enabled || !isChatRoute) return;
    Object.values(chatStore.roomsById).forEach(clearSeenRoomNotifications);
    localRooms.forEach(clearSeenRoomNotifications);
    chatStore.markRoomSeen("", userId);
  }, [clearSeenRoomNotifications, enabled, isChatRoute, userId, chatStore, localRooms]);

  const unreadCount = useMemo(
    () => {
      if (isChatRoute) return 0;
      if (isSupportRole(role)) {
        return sanitizeAdminUnreadCount(Object.values(chatStore.roomsById), userId);
      }
      return chatStore.getUnreadCount(userId);
    },
    [isChatRoute, chatStore, userId, role],
  );

  return {
    connected,
    rooms,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}
