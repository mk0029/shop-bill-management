"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import ChatWindow from "@/components/chat/ChatWindow";
import { CustomerInfoPopup } from "@/components/chat/CustomerInfoPopup";
import type { ChatMessage } from "@/lib/chat-api";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";

export default function CustomerChatPage() {
  const { user, role, hydrated } = useAuthStore();
  const { openRoomByCustomer, setActiveRoom, activeRoomId, subscribeRealtime, loadRooms, messagesByRoomId } = useChatStore();
  const [initializing, setInitializing] = React.useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  const customerId = useMemo(() => {
    const u = user as { id?: string; _id?: string } | null;
    // For chat participants and references, we must use the Sanity user document _id (or fallback to id if that's already the Sanity id)
    return u?._id || u?.id || undefined;
  }, [user]);

  const activeRoomMessages: ChatMessage[] = useMemo(() => {
    if (!activeRoomId) return [] as ChatMessage[];
    return (messagesByRoomId[activeRoomId] || []) as ChatMessage[];
  }, [messagesByRoomId, activeRoomId]);

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
        // Load rooms filtered by current customer ID to ensure only customer's rooms are fetched
        await loadRooms({ customerId: String(customerId) });
        
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
  }, [hydrated, role, customerId, subscribeRealtime, openRoomByCustomer, setActiveRoom, activeRoomId, loadRooms]);

  if (!hydrated || initializing) {
    return (
      <div className="h-[calc(100vh-49px)] md:h-[calc(100dvh-94px)] -mt-6">
        <ChatLoadingState title="Loading chat" subtitle="Connecting to the shop and syncing messages…" />
      </div>
    );
  }

  if (role !== 'customer') {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  if (!customerId || !activeRoomId) {
    return <div className="p-6">Unable to initialize chat. Please try again.</div>;
  }

  return (
    <div className="h-[calc(100vh-49px)] md:h-[calc(100dvh-94px)] -mt-6">
      <div className="space-y-4 h-full flex flex-col !pt-0">
        {/* Modern Dark Chat Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Admin Avatar */}
              <div className="relative">
                <button
                  onClick={() => setInfoOpen(true)}
                  className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 focus:outline-none"
                  aria-label="Open admin info"
                >
                  A
                </button>
              </div>
              
              {/* Admin Info */}
              <div className="flex flex-col">
                <div className="font-semibold text-white text-base">Shop Admin</div>
                <div className="text-xs text-gray-400">
                  We&apos;re here to help with your orders
                </div>
              </div>
            </div>

            {/* Info Button */}
            <button
              onClick={() => setInfoOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              aria-label="View details"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col grow overflow-hidden">
          <ChatWindow 
            roomId={activeRoomId} 
            senderId={String(customerId)} 
            actor="customer" 
          />
        </div>

        {/* Customer Info Popup */}
        {customerId && (
          <CustomerInfoPopup
            isOpen={infoOpen}
            onClose={() => setInfoOpen(false)}
            customerId={customerId}
            customerName={user?.name || "Customer"}
            roomId={activeRoomId}
            messages={activeRoomMessages}
          />
        )}
      </div>
    </div>
  );
}
