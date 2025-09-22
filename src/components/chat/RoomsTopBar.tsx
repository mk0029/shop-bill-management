"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatRoom } from "@/lib/chat-api";
import NewChatLauncher from "./new-chat-launcher";
import { Plus } from "lucide-react";

export default function RoomsTopBar(props: { activeRoomId?: string; onSelect: (roomId: string) => void; onAddNew?: () => void; adminId?: string; customerId?: string }) {
  const { rooms, loadRooms } = useChatStore();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadRooms({ adminId: props.adminId, customerId: props.customerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.adminId, props.customerId]);

  const ordered = useMemo(() => {
    // Sort by lastMessageAt/createdAt desc so most recent rooms appear first
    const list = [...rooms];
    list.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime());
    return list;
  }, [rooms]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-1">
        {/* Add new */}
        <button
          type="button"
          onClick={() => setShowNew(true)}
          title="Start new chat"
          className={`!-translate-y-2.5 flex-shrink-0 w-9 sm:w-12 aspect-square rounded-full border flex items-center justify-center bg-white/70 dark:bg-zinc-900/60 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60`}
        >
          <Plus className="w-6 h-6" />
        </button>
        {ordered.map((r: ChatRoom) => {
          // Hide unread count if we're currently viewing this room
          const isCurrentRoom = props.activeRoomId === r._id;
          const unread = isCurrentRoom ? 0 : (props.customerId ? (r.unreadForCustomer || 0) : (r.unreadForAdmins || 0));
          const label = r.customer?.name || r.roomName || "Chat";
          const initials = (label || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
          const isActive = props.activeRoomId === r._id;
          return (
            <div key={r._id} className="flex-shrink-0">
              <button
                type="button"
                onClick={() => props.onSelect(r._id)}
                className={`relative w-9 sm:w-12 aspect-square rounded-full border flex items-center justify-center ${isActive ? 'ring-2 ring-emerald-500' : ''} bg-zinc-100 dark:bg-zinc-800`}
                title={label}
              >
                <span className="text-sm font-semibold">{initials}</span>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
              <div className="mt-1 text-center text-xs truncate w-9 sm:w-12 opacity-80">{label}</div>
            </div>
          );
        })}
      </div>
      {showNew && (
        <NewChatLauncher onClose={() => setShowNew(false)} onRoomOpen={(roomId) => { setShowNew(false); props.onSelect(roomId); props.onAddNew?.(); }} />
      )}
    </div>
  );
}
