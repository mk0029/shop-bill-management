"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyShopChatRoom, listShopChatRooms } from "./api";
import { useShopChatSocket } from "./socket";
import type { ShopChatMessage, ShopChatRoom } from "./types";
import { useNotificationStore } from "@/store/notification-store";
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

type LastMessageType = NonNullable<ShopChatRoom["lastMessage"]>["type"];

function messageTypeLabel(
  type?: ShopChatMessage["type"] | LastMessageType | null,
) {
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  if (type === "image") return "image";
  if (type === "file") return "file";
  if (type && type !== "text") return "media";
  return "message";
}

function messageTypePhrase(
  type?: ShopChatMessage["type"] | LastMessageType | null,
) {
  const label = messageTypeLabel(type);
  return label === "audio" || label === "image"
    ? `an ${label}`
    : `a ${label}`;
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
  const candidates = [
    data.actorUserId,
    data.createdById,
    data.updatedById,
    data.clearedById,
  ];
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
  const enabled = Boolean(
    userId && (isSupportRole(role) || role === "customer"),
  );
  const { socket, connected } = useShopChatSocket(undefined, enabled);
  const [rooms, setRooms] = useState<ShopChatRoom[]>([]);
  const roomsRef = useRef<ShopChatRoom[]>([]);
  const loadedRef = useRef(false);
  const notifiedMessageIdsRef = useRef(new Set<string>());
  const chatPath = role === "customer" ? "/customer/chat" : "/admin/chat";
  const isChatRoute =
    pathname === "/chat" ||
    pathname === chatPath ||
    pathname.startsWith(`${chatPath}/`);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const maybeNotifyFromRoom = useCallback(
    (room: ShopChatRoom) => {
      const last = room.lastMessage;
      if (!last) return;

      if (Number(room.unreadBy?.[userId] || 0) <= 0) {
        useNotificationStore.getState().removeWhere((notification) => {
          const meta = notification.meta;
          return meta?.type === "shop_chat" && meta?.roomId === room.roomId;
        });
        clearAppSystemNotifications({ roomId: room.roomId });
      }

      const previous = roomsRef.current.find(
        (item) => item.roomId === room.roomId,
      );
      if (previous?.lastMessage?.messageId === last.messageId) return;

      const activeChatId = getActiveChatId();
      if (activeChatId === room.roomId) {
        markNotificationHandled(last.messageId);
        clearAppSystemNotifications({ roomId: room.roomId });
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
            roomId: room.roomId,
            messageId: last.messageId,
            messageType: last.type,
            senderName,
            actorUserId: actorUserId || undefined,
            userId: role === "customer" ? userId : room.customerId,
            route: {
              pathname: chatPath,
              query:
                role === "customer"
                  ? undefined
                  : { customerId: room.customerId },
            },
          },
        });
      }

    },
    [chatPath, isChatRoute, role, userId],
  );

  const upsertRoom = useCallback((room: ShopChatRoom) => {
    setRooms((prev) => {
      const exists = prev.some((item) => item.roomId === room.roomId);
      const next = exists
        ? prev.map((item) => (item.roomId === room.roomId ? room : item))
        : [room, ...prev];
      return next.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
    });
  }, []);

  const clearChatRoomNotifications = useCallback((roomId?: string | null) => {
    useNotificationStore.getState().removeWhere((notification) => {
      const meta = notification.meta;
      if (notification.type !== "chat" && meta?.type !== "shop_chat") return false;
      if (!roomId) return true;
      return String(meta?.roomId || "") === roomId;
    });
    if (roomId) clearAppSystemNotifications({ roomId });
    else clearAppSystemNotifications();
  }, []);

  const clearSeenRoomNotifications = useCallback(
    (room: ShopChatRoom) => {
      const lastMessageId = room.lastMessage?.messageId;
      if (lastMessageId) {
        markNotificationHandled(lastMessageId);
        markNotificationHandled(chatNotificationId(lastMessageId));
      }
      clearChatRoomNotifications(room.roomId);
    },
    [clearChatRoomNotifications],
  );

  const markRoomSeenLocally = useCallback(
    (room: ShopChatRoom) => {
      return {
        ...room,
        unreadBy: {
          ...(room.unreadBy || {}),
          ...(userId ? { [userId]: 0 } : {}),
        },
      };
    },
    [userId],
  );

  useEffect(() => {
    if (!enabled) {
      setRooms([]);
      roomsRef.current = [];
      loadedRef.current = false;
      return;
    }
    let cancelled = false;
    async function loadUnreadRooms() {
      try {
        if (isSupportRole(role)) {
          const response = await listShopChatRooms();
          if (!cancelled) {
            if (isChatRoute) response.rooms.forEach(clearSeenRoomNotifications);
            const nextRooms = isChatRoute ? response.rooms.map(markRoomSeenLocally) : response.rooms;
            setRooms(nextRooms);
            roomsRef.current = nextRooms;
            loadedRef.current = true;
          }
          return;
        }
        if (role === "customer") {
          const response = await getMyShopChatRoom();
          if (!cancelled) {
            if (isChatRoute) clearSeenRoomNotifications(response.room);
            const nextRooms = [isChatRoute ? markRoomSeenLocally(response.room) : response.room];
            setRooms(nextRooms);
            roomsRef.current = nextRooms;
            loadedRef.current = true;
          }
        }
      } catch {
        if (!cancelled) {
          setRooms([]);
          roomsRef.current = [];
          loadedRef.current = true;
        }
      }
    }
    void loadUnreadRooms();
    return () => {
      cancelled = true;
    };
  }, [clearSeenRoomNotifications, enabled, isChatRoute, markRoomSeenLocally, role]);

  useEffect(() => {
    if (!socket || !enabled) return;
    const onRoomUpdated = (room: ShopChatRoom) => {
      if (isChatRoute) {
        clearSeenRoomNotifications(room);
        upsertRoom(markRoomSeenLocally(room));
        return;
      }
      maybeNotifyFromRoom(room);
      upsertRoom(room);
    };
    const onRoomJoined = ({ room }: { room: ShopChatRoom }) => {
      if (isChatRoute) clearSeenRoomNotifications(room);
      upsertRoom(isChatRoute ? markRoomSeenLocally(room) : room);
    };
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:joined", onRoomJoined);
    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:joined", onRoomJoined);
    };
  }, [
    clearSeenRoomNotifications,
    enabled,
    isChatRoute,
    markRoomSeenLocally,
    maybeNotifyFromRoom,
    socket,
    upsertRoom,
  ]);

  useEffect(() => {
    if (!enabled || !isChatRoute) return;
    roomsRef.current.forEach(clearSeenRoomNotifications);
    setRooms((prev) => {
      const next = prev.map(markRoomSeenLocally);
      roomsRef.current = next;
      return next;
    });
  }, [clearSeenRoomNotifications, enabled, isChatRoute, markRoomSeenLocally]);

  const unreadCount = useMemo(
    () =>
      isChatRoute
        ? 0
        : rooms.reduce(
            (sum, room) => sum + Number(room.unreadBy?.[userId] || 0),
            0,
          ),
    [isChatRoute, rooms, userId],
  );

  return {
    connected,
    rooms,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}
