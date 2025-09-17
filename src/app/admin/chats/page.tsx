"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useSearchParams } from "next/navigation";

export default function AdminChatsPage() {
  const { user, role, hydrated } = useAuthStore();
  const { activeRoomId, setActiveRoom, subscribeRealtime, rooms } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const search = useSearchParams();
  const [billStats, setBillStats] = useState<{ count: number; total: number } | null>(null);

  const adminId = useMemo(() => {
    const u = (user ?? {}) as Partial<{ id: string; _id: string }>;
    // Always prefer the Sanity user document _id for chat sender comparison
    return u._id || u.id || undefined;
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    subscribeRealtime();
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Auto-open chat from deep link (?roomId=)
  useEffect(() => {
    if (!hydrated) return;
    const rid = search?.get("roomId");
    if (rid) {
      void setActiveRoom(rid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, search]);

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

  // Fetch bill stats for header (count and total amount)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeCustomer?.id) { setBillStats(null); return; }
      try {
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(activeCustomer.id)}/list`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json?.success && Array.isArray(json.data)) {
          const items = json.data as Array<{ totalAmount?: number }|Record<string, unknown>>;
          const count = items.length;
          const total = items.reduce((sum, it) => sum + Number((it as { totalAmount?: number|string }).totalAmount ?? 0), 0);
          setBillStats({ count, total });
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
    return <div className="p-6">Loading chats…</div>;
  }
  if (role !== "admin") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <div className="h-[calc(100vh-85px)] md:h-[calc(100vh-155px)]">
      <div className="space-y-4 h-full flex flex-col !pt-0">
        {/* Header: selected user and bill stats */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{activeCustomer?.name || "Select a chat"}</div>
            {activeCustomer && (
              <div className="text-sm opacity-80">
                Bills: {billStats ? billStats.count : '…'} · Total: ₹{billStats ? Number(billStats.total).toLocaleString('en-IN') : '…'}
              </div>
            )}
          </div>
          {/* Placeholder for actions (e.g., View customer, create bill) */}
          <div className="flex items-center gap-2">
            {/* Add action buttons later if needed */}
          </div>
        </div>

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
