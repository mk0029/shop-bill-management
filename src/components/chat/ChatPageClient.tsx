"use client";

import React, { useEffect } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/chat-store";
import type { ChatRoom, ChatMessage } from "@/lib/chat-api";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";

export default function ChatPageClient(props: {
  initialRooms: ChatRoom[];
  initialMessagesByRoomId: Record<string, ChatMessage[]>;
  activeRoomId: string;
  actor: "admin" | "customer";
  senderId: string;
}) {
  const { initialRooms, initialMessagesByRoomId, activeRoomId, actor, senderId } = props;

  useEffect(() => {
    // Seed rooms and messages into the zustand store
    useChatStore.setState((s) => ({
      ...s,
      rooms: initialRooms || [],
      messagesByRoomId: { ...(s.messagesByRoomId || {}), ...initialMessagesByRoomId },
      activeRoomId,
    }));

    // Mark read for the active room
    try {
      const markRead = useChatStore.getState().markRead;
      if (activeRoomId) {
        markRead(activeRoomId, actor).catch(() => {});
      }
    } catch {}

    // Start realtime after hydration
    try {
      const subscribeRealtime = useChatStore.getState().subscribeRealtime;
      subscribeRealtime();
    } catch {}
  }, [activeRoomId, actor, initialRooms, initialMessagesByRoomId]);

  if (!activeRoomId) {
    return <ChatEmptyState />;
  }

  return (
    <div className="flex flex-col grow overflow-hidden h-full">
      <ChatWindow roomId={activeRoomId} senderId={senderId} actor={actor} />
    </div>
  );
}
