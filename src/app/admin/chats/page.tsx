"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoomsSidebar from "@/components/chat/RoomsSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
// no query param handling here

export default function AdminChatsPage() {
  const { user, role, hydrated } = useAuthStore();
  const { activeRoomId, setActiveRoom, subscribeRealtime } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('admin_chats_sidebar_collapsed') === '1'; } catch { return false; }
  });

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

  // persist collapsed state
  useEffect(() => {
    try { localStorage.setItem('admin_chats_sidebar_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  // Do not auto-open any specific chat from query params.

  if (!hydrated || initializing) {
    return <div className="p-6">Loading chats…</div>;
  }
  if (role !== "admin") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <div className="p-0 md:p-0 h-[100dvh]">
      <div className="grid grid-cols-12 h-full">
        {/* Sidebar */}
        {!collapsed && (
          <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3 border-r border-zinc-200 dark:border-zinc-800 h-full overflow-hidden">
            <RoomsSidebar
              activeRoomId={activeRoomId || undefined}
              onSelect={(rid) => {
                setActiveRoom(rid);
                setCollapsed(true); // auto-collapse after selecting a chat
              }}
            />
          </aside>
        )}
        {/* Content */}
        <main className={`col-span-12 ${collapsed ? 'md:col-span-12' : 'md:col-span-8 lg:col-span-9 xl:col-span-9'} h-full overflow-hidden relative`}>
          <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
            <div className="w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur border rounded-md p-4 mb-2">
              <h1 className="text-xl font-semibold">Chat</h1>
              <p className="text-sm opacity-70">You can message customers here.</p>
            </div>
            <div className="flex-1 min-h-0">
              {activeRoomId && adminId ? (
                <ChatWindow roomId={activeRoomId} senderId={String(adminId)} actor="admin" />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">Select a chat to start messaging</div>
              )}
            </div>
          </div>
          {collapsed && (
            <button
              type="button"
              className="hidden md:flex items-center justify-center absolute left-0 top-24 -translate-x-1/2 h-10 w-10 rounded-full border bg-white/70 dark:bg-zinc-900/60 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
            >
              {'>'}
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
