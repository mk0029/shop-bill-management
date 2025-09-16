"use client";

import React, { useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatRoom } from "@/lib/chat-api";
import NewChatLauncher from "./new-chat-launcher";

export default function RoomsSidebar(props: { adminId?: string; customerId?: string; onSelect: (roomId: string) => void; activeRoomId?: string }) {
  const { rooms, loadRooms } = useChatStore();
  const [showNew, setShowNew] = React.useState(false);

  useEffect(() => {
    loadRooms({ adminId: props.adminId, customerId: props.customerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.adminId, props.customerId]);

  return (
    <div className="w-full h-full flex flex-col bg-white/60 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="font-semibold">Chats</div>
        <button className="px-2 py-1 text-xs rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60" onClick={() => setShowNew(true)}>New</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {rooms.map((r: ChatRoom) => (
            <li key={r._id} className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 ${props.activeRoomId === r._id ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`} onClick={() => props.onSelect(r._id)}>
              <div>
                <div className="text-sm font-medium">{r.roomName || r.customer?.name || 'Chat'}</div>
                <div className="text-xs opacity-70 truncate max-w-[220px]">{r.lastMessage || ''}</div>
              </div>
              {(() => {
                const unread = props.customerId ? (r.unreadForCustomer || 0) : (r.unreadForAdmins || 0);
                return unread > 0 ? (
                  <span className="ml-2 inline-flex items-center justify-center text-xs bg-blue-600 text-white rounded-full w-6 h-6">{unread}</span>
                ) : null;
              })()}
            </li>
          ))}
          {rooms.length === 0 && (
            <li className="p-3 text-sm opacity-70">No chats yet</li>
          )}
        </ul>
      </div>
      {showNew && (
        <NewChatLauncher onClose={() => setShowNew(false)} onRoomOpen={(roomId) => { setShowNew(false); props.onSelect(roomId); }} />
      )}
    </div>
  );
}

