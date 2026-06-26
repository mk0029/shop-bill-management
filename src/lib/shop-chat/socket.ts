"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getShopAuthHeader } from "./auth";
import { SHOP_CHAT_URL } from "./api";
import type { ShopChatMessage, ShopChatRoom, ChatMedia } from "./types";

type ServerToClientEvents = {
  "room:joined": (payload: { room: ShopChatRoom }) => void;
  "room:updated": (room: ShopChatRoom) => void;
  "room:error": (payload: { roomId?: string; message: string }) => void;
  "message:new": (message: ShopChatMessage) => void;
  "message:cleared": (payload: { roomId: string; message: ShopChatMessage }) => void;
  "message:status": (payload: { messages: ShopChatMessage[] }) => void;
  "message:read": (payload: { roomId: string; userId: string; messageIds: string[] }) => void;
  "typing:update": (payload: { roomId: string; userId: string; role: string; name: string; typing: boolean; at: string }) => void;
  "presence:snapshot": (payload: {
    users: Array<{ userId: string; role: string; name: string; online?: boolean; lastSeen?: string }>;
    lastSeen?: Array<{ userId: string; online?: boolean; lastSeen?: string }>;
  }) => void;
};

type ClientToServerEvents = {
  "room:join": (payload: { roomId: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "message:send": (
    payload: {
      roomId: string;
      text: string;
      type?: ShopChatMessage["type"];
      attachments?: unknown[];
      clientMessageId: string;
      replyTo?: ShopChatMessage["replyTo"];
    },
    ack: (payload: { ok: boolean; message?: ShopChatMessage; room?: ShopChatRoom; error?: string; clientMessageId?: string }) => void,
  ) => void;
  "typing:update": (payload: { roomId: string; typing: boolean }) => void;
  "message:delivered": (payload: { messageIds: string[] }) => void;
  "message:read": (payload: { roomId: string; messageIds?: string[] }) => void;
  "message:seen": (payload: { roomId: string }) => void;
  "chat:active": (payload: { roomId?: string | null }) => void;
  "presence:ping": () => void;
  "presence:offline": () => void;
};

export type ShopChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function toBase64Url(value: string) {
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch {
    return value;
  }
}

export function useShopChatSocket(activeRoomId?: string | null, enabled = true) {
  const [socket, setSocket] = useState<ShopChatSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const activeRoomRef = useRef<string | null>(activeRoomId || null);

  useEffect(() => {
    activeRoomRef.current = activeRoomId || null;
  }, [activeRoomId]);

  useEffect(() => {
    if (!enabled) return;
    const authStorage = getShopAuthHeader();
    if (!authStorage) return;
    const shouldConnect = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const nextSocket: ShopChatSocket = io(`${SHOP_CHAT_URL}/chat`, {
      autoConnect: shouldConnect(),
      auth: { authStorage: toBase64Url(authStorage) },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    nextSocket.on("connect", () => {
      setConnected(true);
      nextSocket.emit("presence:ping");
      if (activeRoomRef.current) {
        nextSocket.emit("room:join", { roomId: activeRoomRef.current });
        nextSocket.emit("chat:active", { roomId: activeRoomRef.current });
      }
    });
    nextSocket.on("disconnect", () => {
      setConnected(false);
    });

    setSocket(nextSocket);
    const goOffline = () => {
      if (nextSocket.connected) {
        if (activeRoomRef.current) {
          nextSocket.emit("typing:update", { roomId: activeRoomRef.current, typing: false });
        }
        nextSocket.emit("presence:offline");
      }
      if (nextSocket.connected || nextSocket.active) nextSocket.disconnect();
    };
    const goOnline = () => {
      if (shouldConnect() && !nextSocket.connected) nextSocket.connect();
    };
    const onVisibilityChange = () => {
      if (shouldConnect()) goOnline();
      else goOffline();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", goOffline);
    window.addEventListener("pageshow", goOnline);
    window.addEventListener("focus", goOnline);
    document.addEventListener("freeze", goOffline);
    const presencePingTimer = window.setInterval(() => {
      if (nextSocket.connected && shouldConnect()) {
        nextSocket.emit("presence:ping");
      }
    }, 25_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", goOffline);
      window.removeEventListener("pageshow", goOnline);
      window.removeEventListener("focus", goOnline);
      document.removeEventListener("freeze", goOffline);
      window.clearInterval(presencePingTimer);
      if (nextSocket.connected) {
        if (activeRoomRef.current) {
          nextSocket.emit("typing:update", { roomId: activeRoomRef.current, typing: false });
        }
        nextSocket.emit("presence:offline");
      }
      nextSocket.disconnect();
      setConnected(false);
      setSocket(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!socket || !activeRoomId) return;
    socket.emit("room:join", { roomId: activeRoomId });
    socket.emit("chat:active", { roomId: activeRoomId });
    return () => {
      socket.emit("chat:active", { roomId: null });
      socket.emit("room:leave", { roomId: activeRoomId });
    };
  }, [activeRoomId, socket]);

  const sendMessage = useCallback(
    (payload: {
      roomId: string;
      text: string;
      type?: ShopChatMessage["type"];
      attachments?: unknown[];
      media?: ChatMedia | null;
      clientMessageId: string;
      replyTo?: ShopChatMessage["replyTo"];
    }) =>
      new Promise<{ message: ShopChatMessage; room?: ShopChatRoom }>((resolve, reject) => {
        if (!socket?.connected) {
          reject(new Error("Socket is not connected"));
          return;
        }
        socket.emit("message:send", payload, (ack) => {
          if (!ack.ok || !ack.message) {
            reject(new Error(ack.error || "Message failed"));
            return;
          }
          resolve({ message: ack.message, room: ack.room });
        });
      }),
    [socket],
  );

  return { socket, connected, sendMessage };
}
