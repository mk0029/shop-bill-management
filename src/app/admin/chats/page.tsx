"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoomsTopBar from "@/components/chat/RoomsTopBar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
// no query param handling here

export default function AdminChatsPage() {
  const { user, role, hydrated } = useAuthStore();
  const { activeRoomId, setActiveRoom, subscribeRealtime } = useChatStore();
  const [initializing, setInitializing] = useState(true);

  const adminId = useMemo(() => {
    const u = (user ?? {}) as Partial<{ id: string; _id: string }>;
    return u.id || u._id || undefined;
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    subscribeRealtime();
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Do not auto-open any specific chat from query params.

  if (!hydrated || initializing) {
    return <div className="p-6">Loading chats…</div>;
  }
  if (role !== "admin") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <div className="p-0 md:p-0 h-[calc(100vh-65px)]">
      <div className="p-4 md:p-6 space-y-4 h-full flex flex-col !pt-0">
          <RoomsTopBar
          activeRoomId={activeRoomId || undefined}
          onSelect={(rid) => setActiveRoom(rid)}
          onAddNew={() => {
           
          }}
        /> 
      
   

        <div className="flex flex-col grow overflow-auto min-h-0">
          {activeRoomId && adminId ? (
            <ChatWindow roomId={activeRoomId} senderId={String(adminId)} actor="admin" />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">Select a chat to start messaging</div>
          )}
        </div>
      </div>
    </div>
  );
}
