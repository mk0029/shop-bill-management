"use client";

import React, { useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import ChatWindow from "@/components/chat/ChatWindow";

export default function CustomerChatPage() {
  const { user, role, hydrated } = useAuthStore();
  const { openRoomByCustomer, setActiveRoom, activeRoomId, subscribeRealtime } = useChatStore();
  const [initializing, setInitializing] = React.useState(true);

  const customerId = useMemo(() => {
    const u = user as { id?: string; _id?: string } | null;
    // For chat participants and references, we must use the Sanity user document _id (or fallback to id if that's already the Sanity id)
    return u?._id || u?.id || undefined;
  }, [user]);

  // Initialize chat room and realtime subscription
  useEffect(() => {
    if (!hydrated) return;
    
    // Enable realtime updates
    subscribeRealtime();
    
    if (role !== "customer" || !customerId) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        const roomId = await openRoomByCustomer(String(customerId));
        await setActiveRoom(roomId);
      } finally {
        setInitializing(false);
      }
    })();
    
    // Cleanup on unmount
    return () => {
      if (activeRoomId) {
        setActiveRoom(activeRoomId).catch(() => {});
      }
    };
  }, [hydrated, role, customerId, subscribeRealtime, openRoomByCustomer, setActiveRoom, activeRoomId]);

  if (!hydrated || initializing) {
    return <div className="p-6">Loading chat…</div>;
  }

  if (role !== 'customer') {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  if (!customerId || !activeRoomId) {
    return <div className="p-6">Unable to initialize chat. Please try again.</div>;
  }

  return (
    <div className="h-[calc(100vh-70px)] md:h-[calc(100dvh-130px)] -mt-3 md:-mt-12">
      <div className="space-y-4 h-full flex flex-col !pt-0">
        <div className="flex items-center justify-between gap-4 px-4 pb-2 md:pb-4 border-b dark:border-zinc-700">
          <div>
            <div className="text-lg font-semibold">Chat With Admin</div>
            <div className="text-sm text-zinc-500">We&apos;re here to help with your orders and questions</div>
          </div>
        </div>

        <div className="flex flex-col grow overflow-hidden">
          <ChatWindow 
            roomId={activeRoomId} 
            senderId={String(customerId)} 
            actor="customer" 
          />
        </div>
      </div>
    </div>
  );
}
