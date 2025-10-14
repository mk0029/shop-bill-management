"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { CustomerInfoPopup } from "@/components/chat/CustomerInfoPopup";
import type { ChatMessage } from "@/lib/chat-api";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";

export default function AdminChatsPage() {
  const { user, role, hydrated } = useAuthStore();
  const { activeRoomId, subscribeRealtime, rooms, loadRooms, resetChatState, messagesByRoomId } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const [billStats, setBillStats] = useState<{ count: number; total: number } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const adminId = useMemo(() => {
    const u = (user ?? {}) as Partial<{ id: string; _id: string }>;
    // Always prefer the Sanity user document _id for chat sender comparison
    return u._id || u.id || undefined;
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    
    // Reset chat state on page load (WhatsApp-style)
    resetChatState();
    
    // Initialize chat - fetch all rooms without filtering
    const init = async () => {
      await loadRooms();
      subscribeRealtime();
      setInitializing(false);
    };
    
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, adminId]);

  // Derive selected customer's basic info from active room
  const activeCustomer = useMemo(() => {
    if (!activeRoomId) return null;
    const r = (rooms || []).find((x) => x._id === activeRoomId);
    if (!r?.customer) return null;
    const c = r.customer as { _id?: string; name?: string };
    const id = c?._id;
    const name = c?.name || "Customer";
    return id ? { id, name } : null;
  }, [rooms, activeRoomId]);

  const activeRoomMessages: ChatMessage[] = useMemo(() => {
    if (!activeRoomId) return [] as ChatMessage[];
    return (messagesByRoomId[activeRoomId] || []) as ChatMessage[];
  }, [messagesByRoomId, activeRoomId]);

  // Reset bill stats immediately when activeRoomId changes to prevent flash of old data
  useEffect(() => {
    setBillStats(null);
  }, [activeRoomId]);

  // Fetch bill stats for header (pending/partial/due bills and unpaid amount)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeCustomer?.id) { setBillStats(null); return; }
      try {
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(activeCustomer.id)}/list`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json.success && Array.isArray(json.data)) {
          const items = json.data as Array<{ 
            paymentStatus?: string; 
            balanceAmount?: number;
            totalAmount?: number;
          }>;
          
          // Filter only pending, partial, and due bills (not paid)
          const unpaidBills = items.filter(bill => {
            const status = bill.paymentStatus?.toLowerCase();
            return status === 'pending' || status === 'partial' || status === 'due';
          });
          
          // Calculate total unpaid amount (balance amount for unpaid bills)
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
    return () => { alive = false; };
  }, [activeCustomer?.id]);

  if (!hydrated || initializing) {
    return (
      <div className="h-[calc(100vh-58px)] md:h-[calc(100vh-130px)] -mt-6">
        <ChatLoadingState title="Loading chats" subtitle="Preparing your conversations and messages…" />
      </div>
    );
  }
  if (role !== "admin") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <div className="h-[calc(100vh-58px)] md:h-[calc(100vh-130px)] -mt-6">
      <div className="space-y-4 h-full flex flex-col !pt-0">
        {/* Modern Dark Chat Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Left side: Avatar + User Info */}
            <div className="flex items-center gap-3">
              {activeCustomer ? (
                <>
                  {/* User Avatar */}
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
                  
                  {/* User Info */}
                  <div className="flex flex-col">
                    <div className="font-semibold text-white text-base">{activeCustomer.name}</div>
                    {billStats && (
                      <div className="text-xs text-gray-400">
                        {billStats.count} bills • ₹{Number(billStats.total).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Select a chat</div>
                    <div className="text-xs text-gray-400">Choose a customer to start messaging</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: More options only */}
            {activeCustomer && (
              <div className="flex items-center gap-2">
                {/* More options (3 dots) */}
                <button
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  onClick={() => setInfoOpen(true)}
                  aria-label="Open chat info"
                >
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col grow overflow-auto min-h-0">
          {activeRoomId && adminId ? (
            <ChatWindow roomId={activeRoomId} senderId={String(adminId)} actor="admin" />
          ) : (
            <ChatEmptyState showHeader={false} />
          )}
        </div>

        {/* Customer Info Popup */}
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
