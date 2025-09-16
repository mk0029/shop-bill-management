"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoomsSidebar from "@/components/chat/RoomsSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export default function AdminChatsPage() {
  const { user, role, hydrated } = useAuthStore();
  const { activeRoomId, setActiveRoom, subscribeRealtime } = useChatStore();
  const [initializing, setInitializing] = useState(true);

  const adminId = useMemo(() => {
    const anyUser = user as any;
    return anyUser?.id || anyUser?._id || undefined;
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    subscribeRealtime();
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated || initializing) {
    return <div className="p-6">Loading chats…</div>;
  }
  if (role !== "admin") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      <RoomsSidebar adminId={adminId} activeRoomId={activeRoomId || undefined} onSelect={(rid) => setActiveRoom(rid)} />
      <div className="flex-1">
        {activeRoomId && adminId ? (
          <ChatWindow roomId={activeRoomId} senderId={String(adminId)} actor="admin" />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">Select a chat to start messaging</div>
        )}
      </div>
    </div>
  );
}
