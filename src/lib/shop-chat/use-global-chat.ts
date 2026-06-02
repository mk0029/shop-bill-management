"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyShopChatRoom, listShopChatRooms } from "./api";
import { useShopChatSocket } from "./socket";
import type { ShopChatRoom } from "./types";

function isSupportRole(role?: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export function useGlobalShopChat(user?: { id?: string; _id?: string; role?: string | null } | null) {
  const userId = String(user?.id || user?._id || "");
  const role = String(user?.role || "");
  const enabled = Boolean(userId && (isSupportRole(role) || role === "customer"));
  const { socket, connected } = useShopChatSocket(undefined, enabled);
  const [rooms, setRooms] = useState<ShopChatRoom[]>([]);

  const upsertRoom = useCallback((room: ShopChatRoom) => {
    setRooms((prev) => {
      const exists = prev.some((item) => item.roomId === room.roomId);
      const next = exists ? prev.map((item) => (item.roomId === room.roomId ? room : item)) : [room, ...prev];
      return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    async function loadUnreadRooms() {
      try {
        if (isSupportRole(role)) {
          const response = await listShopChatRooms();
          if (!cancelled) setRooms(response.rooms);
          return;
        }
        if (role === "customer") {
          const response = await getMyShopChatRoom();
          if (!cancelled) setRooms([response.room]);
        }
      } catch {
        if (!cancelled) setRooms([]);
      }
    }
    void loadUnreadRooms();
    return () => {
      cancelled = true;
    };
  }, [enabled, role]);

  useEffect(() => {
    if (!socket || !enabled) return;
    const onRoomUpdated = (room: ShopChatRoom) => upsertRoom(room);
    const onRoomJoined = ({ room }: { room: ShopChatRoom }) => upsertRoom(room);
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:joined", onRoomJoined);
    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:joined", onRoomJoined);
    };
  }, [enabled, socket, upsertRoom]);

  const unreadCount = useMemo(
    () => rooms.reduce((sum, room) => sum + Number(room.unreadBy?.[userId] || 0), 0),
    [rooms, userId],
  );

  return {
    connected,
    rooms,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}
