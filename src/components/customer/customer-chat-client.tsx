"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageCircleMore } from "lucide-react";

import ChatWindow from "@/components/chat/ChatWindow";
import { CustomerInfoPopup } from "@/components/chat/CustomerInfoPopup";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";

export type CustomerChatClientProps = {
  customerId: string;
  customerName: string;
};

export default function CustomerChatClient({ customerId, customerName }: CustomerChatClientProps) {
  const {
    openRoomByCustomer,
    setActiveRoom,
    activeRoomId,
    subscribeRealtime,
    messagesByRoomId,
    resetChatState,
    loadRooms,
  } = useChatStore();

  const [initializing, setInitializing] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  const activeRoomMessages: ChatMessage[] = useMemo(() => {
    if (!activeRoomId) return [];
    return (messagesByRoomId[activeRoomId] || []) as ChatMessage[];
  }, [messagesByRoomId, activeRoomId]);

  useEffect(() => {
    let alive = true;

    resetChatState();
    subscribeRealtime();
    void loadRooms({ customerId });

    (async () => {
      try {
        if (!customerId) return;
        const roomId = await openRoomByCustomer(String(customerId));
        if (!alive) return;
        await setActiveRoom(roomId, "customer");
      } finally {
        if (alive) setInitializing(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [customerId, loadRooms, openRoomByCustomer, resetChatState, setActiveRoom, subscribeRealtime]);

  if (initializing) {
    return (
      <div className="h-[100dvh]">
        <ChatLoadingState title="Loading chat" subtitle="Connecting to the shop and syncing messages..." />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-950">
      <div className="flex h-full flex-col overflow-hidden bg-gray-950">
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setInfoOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-sm font-semibold text-white"
              aria-label="Open support info"
            >
              S
            </button>
            <div>
              <div className="text-base font-semibold text-slate-100">Shop Support</div>
              <div className="text-xs text-slate-400">We usually reply quickly</div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {activeRoomId ? (
            <ChatWindow roomId={activeRoomId} senderId={String(customerId)} actor="customer" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircleMore className="h-5 w-5" />
                Initializing support chat...
              </div>
            </div>
          )}
        </div>

        {activeRoomId && (
          <CustomerInfoPopup
            isOpen={infoOpen}
            onClose={() => setInfoOpen(false)}
            customerId={customerId}
            customerName={customerName}
            roomId={activeRoomId}
            messages={activeRoomMessages}
          />
        )}
      </div>
    </div>
  );
}
