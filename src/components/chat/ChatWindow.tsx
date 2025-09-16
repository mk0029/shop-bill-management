"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";

type Props = {
  roomId: string;
  senderId: string;
  actor: "admin" | "customer";
};

export default function ChatWindow({ roomId, senderId, actor }: Props) {
  const { messagesByRoomId, fetchMessages, sendMessage, markRead, markMessageSeen } = useChatStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const seenOnceRef = useRef<Set<string>>(new Set());

  const messages = useMemo(() => messagesByRoomId[roomId] || [], [messagesByRoomId, roomId]);

  useEffect(() => {
    fetchMessages(roomId).then(() => markRead(roomId, actor)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const onSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    await sendMessage(roomId, content, senderId, actor === "customer");
  };

  const getMsgSenderId = (m: ChatMessage): string | undefined => {
    if (!m?.sender) return undefined;
    const s = m.sender as { _id?: string; _ref?: string };
    return s._id ?? s._ref;
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map((m) => {
          const isSelf = getMsgSenderId(m) === senderId;
          const onEnterView = () => {
            if (isSelf) return;
            if (m.status === 'seen') return;
            if (seenOnceRef.current.has(m._id)) return;
            seenOnceRef.current.add(m._id);
            // mark seen for this message
            markMessageSeen(roomId, m._id).catch(() => {});
          };
          return (
            <motion.div
              key={m._id}
              className={`max-w-[80%] rounded px-3 py-2 text-sm ${isSelf ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-white border'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              viewport={{ amount: 1 }}
              onViewportEnter={onEnterView}
            >
              <div>{m.content}</div>
              <div className="text-[10px] opacity-70 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
            </motion.div>
          );
        })}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSend}>Send</button>
      </div>
    </div>
  );
}
