"use client";

import React, { useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatRoom } from "@/lib/chat-api";

export default function RoomsSidebar(props: { adminId?: string; customerId?: string; onSelect: (roomId: string) => void; activeRoomId?: string }) {
  const { rooms, loadRooms, subscribeRealtime } = useChatStore();

  useEffect(() => {
    loadRooms({ adminId: props.adminId, customerId: props.customerId });
    subscribeRealtime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.adminId, props.customerId]);

  return (
    <div className="w-80 border-r h-full overflow-y-auto">
      <div className="p-3 border-b font-semibold">Chats</div>
      <ul>
        {rooms.map((r: ChatRoom) => (
          <li key={r._id} className={`p-3 cursor-pointer flex items-center justify-between ${props.activeRoomId === r._id ? 'bg-gray-100' : ''}`} onClick={() => props.onSelect(r._id)}>
            <div>
              <div className="text-sm font-medium">{r.roomName || r.customer?.name || 'Chat'}</div>
              <div className="text-xs text-gray-500 truncate max-w-[220px]">{r.lastMessage || ''}</div>
            </div>
            {(() => {
              const unread = props.customerId ? (r.unreadForCustomer || 0) : (r.unreadForAdmins || 0);
              return unread > 0 ? (
                <span className="ml-2 inline-flex items-center justify-center text-xs bg-blue-600 text-white rounded-full w-6 h-6">{unread}</span>
              ) : null;
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
