"use client";

import React, { useMemo } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatRoom } from "@/lib/chat-api";

export default function RoomsOverlayList(props: { activeRoomId?: string; onSelect: (roomId: string) => void; adminId?: string; customerId?: string }) {
  const { rooms, loadRooms } = useChatStore();

  React.useEffect(() => {
    loadRooms({ adminId: props.adminId, customerId: props.customerId }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.adminId, props.customerId]);

  const ordered = useMemo(() => {
    const list = [...rooms];
    list.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime());
    return list;
  }, [rooms]);

  return (
    <div className="divide-y divide-gray-800">
      {ordered.map((r: ChatRoom) => {
        // Hide unread count if we're currently viewing this room
        const isCurrentRoom = props.activeRoomId === r._id;
        const unread = isCurrentRoom ? 0 : (props.customerId ? (r.unreadForCustomer || 0) : (r.unreadForAdmins || 0));
        const label = r.customer?.name || r.roomName || "Chat";
        const initials = (label || "?")
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const isActive = props.activeRoomId === r._id;
        const ts = r.lastMessageAt || r.updatedAt || r.createdAt;
        return (
          <button
            key={r._id}
            type="button"
            onClick={() => props.onSelect(r._id)}
            className={`w-full flex items-center gap-3 px-3 py-3 ${isActive ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'} text-left`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${isActive ? 'ring-2 ring-emerald-500' : ''} bg-zinc-100 dark:bg-zinc-800`}>
              <span className="text-sm font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium text-white">{label}</div>
                {ts && <div className="text-[11px] text-gray-400 whitespace-nowrap">{new Date(ts).toLocaleDateString()}</div>}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px]">{unread > 99 ? '99+' : unread}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
      {ordered.length === 0 && (
        <div className="px-3 py-4 text-sm text-gray-400">No chats yet</div>
      )}
    </div>
  );
}
