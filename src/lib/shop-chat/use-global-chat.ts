"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMyShopChatRoom, listShopChatRooms } from "./api";
import { useShopChatSocket } from "./socket";
import type { ShopChatMessage, ShopChatRoom } from "./types";
import { useNotificationStore } from "@/store/notification-store";

function isSupportRole(role?: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

type LastMessageType = NonNullable<ShopChatRoom["lastMessage"]>["type"];

function messageTypeLabel(
  type?: ShopChatMessage["type"] | LastMessageType | null,
) {
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  if (type && type !== "text") return "media";
  return "message";
}

function chatNotificationId(messageId: string) {
  return `shop-chat:${messageId}`;
}

export function useGlobalShopChat(
  user?: { id?: string; _id?: string; role?: string | null } | null,
) {
  const pathname = usePathname() || "";
  const router = useRouter();
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

  const showIncomingToast = useCallback(
    ({
      messageId,
      senderId,
      senderName,
      type,
    }: {
      messageId?: string | null;
      senderId?: string | null;
      senderName?: string | null;
      type?: ShopChatMessage["type"] | LastMessageType | null;
    }) => {
      if (!enabled || !loadedRef.current || isChatRoute) return;
      if (!messageId || !senderId || senderId === userId) return;
      if (notifiedMessageIdsRef.current.has(messageId)) return;

      notifiedMessageIdsRef.current.add(messageId);
      const name = String(senderName || "Someone").trim() || "Someone";
      const label = messageTypeLabel(type);

      toast(`${name} sent a ${label}`, {
        description: "Open chat to reply",
        action: {
          label: "Open",
          onClick: () => router.push(chatPath),
        },
      });
    },
    [chatPath, enabled, isChatRoute, router, userId],
  );

  const maybeNotifyFromRoom = useCallback(
    (room: ShopChatRoom) => {
      const last = room.lastMessage;
      if (!last) return;

      if (Number(room.unreadBy?.[userId] || 0) <= 0) {
        useNotificationStore.getState().removeWhere((notification) => {
          const meta = notification.meta;
          return meta?.type === "shop_chat" && meta?.roomId === room.roomId;
        });
      }

      const previous = roomsRef.current.find(
        (item) => item.roomId === room.roomId,
      );
      if (previous?.lastMessage?.messageId === last.messageId) return;

      if (!isChatRoute && last.senderId !== userId) {
        useNotificationStore.getState().add({
          id: chatNotificationId(last.messageId),
          type: "chat",
          title: `${last.senderName || "Someone"} sent a ${messageTypeLabel(last.type)}`,
          body: "Open chat to reply",
          createdAt: last.createdAt,
          meta: {
            type: "shop_chat",
            roomId: room.roomId,
            messageId: last.messageId,
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

      showIncomingToast({
        messageId: last.messageId,
        senderId: last.senderId,
        senderName: last.senderName,
        type: last.type,
      });
    },
    [chatPath, isChatRoute, role, showIncomingToast, userId],
  );

  const maybeNotifyFromMessage = useCallback(
    (message: ShopChatMessage) => {
      showIncomingToast({
        messageId: message.messageId,
        senderId: message.senderId,
        senderName: message.senderName,
        type: message.type,
      });
    },
    [showIncomingToast],
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
            setRooms(response.rooms);
            roomsRef.current = response.rooms;
            loadedRef.current = true;
          }
          return;
        }
        if (role === "customer") {
          const response = await getMyShopChatRoom();
          if (!cancelled) {
            const nextRooms = [response.room];
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
  }, [enabled, role]);

  useEffect(() => {
    if (!socket || !enabled) return;
    const onRoomUpdated = (room: ShopChatRoom) => {
      maybeNotifyFromRoom(room);
      upsertRoom(room);
    };
    const onRoomJoined = ({ room }: { room: ShopChatRoom }) =>
      upsertRoom(room);
    const onMessageNew = (message: ShopChatMessage) =>
      maybeNotifyFromMessage(message);
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:joined", onRoomJoined);
    socket.on("message:new", onMessageNew);
    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:joined", onRoomJoined);
      socket.off("message:new", onMessageNew);
    };
  }, [
    enabled,
    maybeNotifyFromMessage,
    maybeNotifyFromRoom,
    socket,
    upsertRoom,
  ]);

  const unreadCount = useMemo(
    () =>
      rooms.reduce(
        (sum, room) => sum + Number(room.unreadBy?.[userId] || 0),
        0,
      ),
    [rooms, userId],
  );

  return {
    connected,
    rooms,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}
