"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/chat-store";
import { CustomerInfoPopup } from "@/components/chat/CustomerInfoPopup";
import type { ChatMessage, ChatRoom } from "@/lib/chat-api";
import type { AdminChatRoom } from "@/lib/server-data";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";
import { useSearchParams } from "next/navigation";

export type AdminChatsClientProps = {
  adminId: string;
};

export default function AdminChatsClient({ adminId }: AdminChatsClientProps) {
  const {
    activeRoomId,
    subscribeRealtime,
    rooms: storeRooms,
    resetChatState,
    messagesByRoomId,
    openRoomByCustomer,
    setActiveRoom,
  } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const [billStats, setBillStats] = useState<{
    count: number;
    total: number;
  } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const searchParams = useSearchParams();
  const targetCustomerId = useMemo(
    () => searchParams?.get("customerId") || undefined,
    [searchParams],
  );

  const normalizedRooms = useMemo<ChatRoom[]>(() => {
    return (storeRooms || []).map((room) => ({
      ...room,
      roomName: room.roomName || "Chat",
    })) as ChatRoom[];
  }, [storeRooms]);

  useEffect(() => {
    resetChatState();
    useChatStore.setState({ rooms: normalizedRooms || [], isLoading: false });

    const init = async () => {
      subscribeRealtime();
      try {
        if (targetCustomerId) {
          const roomId = await openRoomByCustomer(String(targetCustomerId));
          await setActiveRoom(roomId);
        }
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [
    resetChatState,
    normalizedRooms,
    subscribeRealtime,
    targetCustomerId,
    openRoomByCustomer,
    setActiveRoom,
  ]);

  const activeCustomer = useMemo(() => {
    const sourceRooms = storeRooms?.length ? storeRooms : normalizedRooms;
    if (!activeRoomId) return null;
    const r = (sourceRooms || []).find((x) => x._id === activeRoomId);
    if (!r?.customer) return null;
    const c = r.customer as { _id?: string; name?: string };
    const id = c?._id;
    const name = c?.name || "Customer";
    return id ? { id, name } : null;
  }, [storeRooms, normalizedRooms, activeRoomId]);

  const activeRoomMessages: ChatMessage[] = useMemo(() => {
    if (!activeRoomId) return [] as ChatMessage[];
    return (messagesByRoomId[activeRoomId] || []) as ChatMessage[];
  }, [messagesByRoomId, activeRoomId]);

  useEffect(() => {
    setBillStats(null);
  }, [activeRoomId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeCustomer?.id) {
        setBillStats(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/bill-book/user/${encodeURIComponent(activeCustomer.id)}/list`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!alive) return;
        if (json.success && Array.isArray(json.data)) {
          const items = json.data as Array<{
            paymentStatus?: string;
            balanceAmount?: number;
            totalAmount?: number;
          }>;

          const unpaidBills = items.filter((bill) => {
            const status = bill.paymentStatus?.toLowerCase();
            return (
              status === "pending" || status === "partial" || status === "due"
            );
          });

          const totalUnpaid = unpaidBills.reduce((sum, bill) => {
            return sum + Number(bill.balanceAmount ?? bill.totalAmount ?? 0);
          }, 0);

          setBillStats({ count: unpaidBills.length, total: totalUnpaid });
        } else {
          setBillStats({ count: 0, total: 0 });
        }
      } catch {
        setBillStats({ count: 0, total: 0 });
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeCustomer?.id]);

  if (initializing) {
    return (
      <div className="h-[calc(100vh-58px)] md:h-[calc(100vh-130px)] -mt-6">
        <ChatLoadingState
          title="Loading chats"
          subtitle="Preparing your conversations and messages…"
        />
      </div>
    );
  }

  const hasRooms = (storeRooms?.length || normalizedRooms?.length || 0) > 0;
  if (!hasRooms) return <ChatEmptyState showHeader={false} />;

  return (
    <div className="h-[calc(100vh-58px)] md:h-[calc(100vh-130px)] -mt-6">
      <div className="space-y-4 h-full flex flex-col !pt-0">
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeCustomer ? (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setInfoOpen(true)}
                      className="w-10 h-10 bg-slate-400/80 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 focus:outline-none"
                      aria-label="Open customer info"
                    >
                      {activeCustomer.name.charAt(0).toUpperCase()}
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <div className="font-semibold text-white text-base">
                      {activeCustomer.name}
                    </div>
                    {billStats && (
                      <div className="text-xs text-gray-400">
                        {billStats.count} bills • ₹
                        {Number(billStats.total).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      Select a chat
                    </div>
                    <div className="text-xs text-gray-400">
                      Choose a customer to start messaging
                    </div>
                  </div>
                </div>
              )}
            </div>
            {activeCustomer && (
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  onClick={() => setInfoOpen(true)}
                  aria-label="Open chat info"
                >
                  <svg
                    className="w-5 h-5 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col grow overflow-auto min-h-0">
          {activeRoomId ? (
            <ChatWindow
              roomId={activeRoomId}
              senderId={String(adminId)}
              actor="admin"
            />
          ) : (
            <ChatEmptyState showHeader={false} />
          )}
        </div>

        {activeCustomer && (
          <CustomerInfoPopup
            isOpen={infoOpen}
            onClose={() => setInfoOpen(false)}
            customerId={activeCustomer.id}
            customerName={activeCustomer.name}
            roomId={activeRoomId ?? undefined}
            messages={activeRoomMessages}
          />
        )}
      </div>
    </div>
  );
}
