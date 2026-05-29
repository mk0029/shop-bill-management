"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  MessageCircleMore,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
} from "lucide-react";

import ChatWindow from "@/components/chat/ChatWindow";
import { CustomerInfoPopup } from "@/components/chat/CustomerInfoPopup";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";

export type AdminChatsClientProps = {
  adminId: string;
};

export default function AdminChatsClient({ adminId }: AdminChatsClientProps) {
  const LAST_ROOM_KEY = "admin_last_open_chat_room_id";
  const {
    activeRoomId,
    subscribeRealtime,
    rooms,
    resetChatState,
    messagesByRoomId,
    openRoomByCustomer,
    setActiveRoom,
    loadRooms,
  } = useChatStore();

  const [initializing, setInitializing] = useState(true);
  const [search, setSearch] = useState("");
  const [billStats, setBillStats] = useState<{ count: number; total: number } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const searchParams = useSearchParams();
  const targetCustomerId = useMemo(() => searchParams?.get("customerId") || undefined, [searchParams]);

  useEffect(() => {
    resetChatState();
    subscribeRealtime();
    void loadRooms({ adminId });
    setInitializing(false);
  }, [adminId, loadRooms, resetChatState, subscribeRealtime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!targetCustomerId) return;

    (async () => {
      try {
        const roomId = await openRoomByCustomer(String(targetCustomerId));
        if (!alive) return;
        await setActiveRoom(roomId, "admin");
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [targetCustomerId, openRoomByCustomer, setActiveRoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!rooms.length || activeRoomId) return;
    const lastRoomId = window.localStorage.getItem(LAST_ROOM_KEY);
    if (lastRoomId && rooms.some((r) => r._id === lastRoomId)) {
      void setActiveRoom(lastRoomId, "admin");
    }
  }, [rooms, activeRoomId, setActiveRoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeRoomId) return;
    window.localStorage.setItem(LAST_ROOM_KEY, activeRoomId);
  }, [activeRoomId]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const name = (room.customer?.name || room.roomName || "").toLowerCase();
      const msg = (room.lastMessage || "").toLowerCase();
      return name.includes(q) || msg.includes(q);
    });
  }, [rooms, search]);

  const activeCustomer = useMemo(() => {
    if (!activeRoomId) return null;
    const r = rooms.find((x) => x._id === activeRoomId);
    if (!r?.customer) return null;
    const c = r.customer as { _id?: string; name?: string };
    return c?._id ? { id: c._id, name: c.name || "Customer" } : null;
  }, [rooms, activeRoomId]);

  const activeRoomMessages: ChatMessage[] = useMemo(() => {
    if (!activeRoomId) return [];
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
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(activeCustomer.id)}/list`, { cache: "no-store" });
        if (!res.ok) {
          if (!alive) return;
          setBillStats({ count: 0, total: 0 });
          return;
        }
        const json = await res.json();
        if (!alive) return;

        if (json.success && Array.isArray(json.data)) {
          const items = json.data as Array<{ paymentStatus?: string; balanceAmount?: number; totalAmount?: number }>;
          const unpaidBills = items.filter((bill) => {
            const status = bill.paymentStatus?.toLowerCase();
            return status === "pending" || status === "partial" || status === "due";
          });
          const totalUnpaid = unpaidBills.reduce((sum, bill) => sum + Number(bill.balanceAmount ?? bill.totalAmount ?? 0), 0);
          setBillStats({ count: unpaidBills.length, total: totalUnpaid });
        } else {
          setBillStats({ count: 0, total: 0 });
        }
      } catch {
        if (!alive) return;
        setBillStats({ count: 0, total: 0 });
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeCustomer?.id]);

  if (initializing) {
    return (
      <div className="h-[100dvh]">
        <ChatLoadingState title="Loading chats" subtitle="Preparing your conversations and messages..." />
      </div>
    );
  }

  const renderListPane = (
    <aside className="h-full border-r border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 p-3">
        <div className="flex items-center rounded-xl border border-gray-700 bg-gray-800 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="h-10 w-full bg-transparent px-2 text-sm text-slate-100 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="no-scrollbar h-[calc(100%-65px)] overflow-y-auto">
        {filteredRooms.map((room) => {
          const name = room.customer?.name || room.roomName || "Customer";
          const unread = room.unreadForAdmins || 0;
          const isActive = room._id === activeRoomId;
          return (
            <button
              key={room._id}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(LAST_ROOM_KEY, room._id);
                }
                void setActiveRoom(room._id, "admin");
              }}
              className={`flex w-full items-center gap-3 border-b border-gray-800 px-3 py-3 text-left transition ${isActive ? "bg-gray-800" : "hover:bg-gray-800/70"}`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-700/60 text-sm font-semibold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base text-slate-100">{name}</div>
                <div className="truncate text-xs text-slate-400">{room.lastMessage || "No messages yet"}</div>
              </div>
              {unread > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">{unread > 99 ? "99+" : unread}</span>}
            </button>
          );
        })}

        {!filteredRooms.length && <div className="p-4 text-sm text-slate-400">No chats found.</div>}
      </div>
    </aside>
  );

  const renderChatPane = (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-gray-950">
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {isMobile && activeRoomId && (
              <button
                type="button"
                onClick={() => resetChatState()}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-gray-800"
                title="Back to chats"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => activeCustomer && setInfoOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-500 text-sm font-semibold text-white"
            >
              {activeCustomer?.name?.charAt(0).toUpperCase() || "?"}
            </button>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-100">{activeCustomer?.name || "Select a chat"}</div>
              {billStats && activeCustomer ? (
                <button
                  onClick={() => window.open(`/admin/customers/${activeCustomer.id}/bills`, "_blank")}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {billStats.count} unpaid bills - Rs.{Number(billStats.total).toLocaleString("en-IN")}
                </button>
              ) : (
                <div className="text-xs text-slate-400">Support chat channel</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => activeRoomId && void setActiveRoom(activeRoomId, "admin")}
              className="rounded-md p-2 text-slate-300 hover:bg-gray-800"
              title="Refresh chat"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => activeCustomer && setInfoOpen(true)}
              className="rounded-md p-2 text-slate-300 hover:bg-gray-800"
              title="Chat options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeRoomId ? (
          <ChatWindow roomId={activeRoomId} senderId={String(adminId)} actor="admin" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircleMore className="h-5 w-5" />
              Select a customer to start chatting
            </div>
          </div>
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
    </main>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-950">
      {isMobile ? (
        <div className="h-full">
          {activeRoomId ? renderChatPane : renderListPane}
        </div>
      ) : (
        <div
          className="grid h-full"
          style={{ gridTemplateColumns: "360px 1fr" }}
        >
          {renderListPane}
          {renderChatPane}
        </div>
      )}
    </div>
  );
}
