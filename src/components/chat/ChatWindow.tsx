"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { sanityClient } from "@/lib/sanity";
import type { ChatMessage } from "@/lib/chat-api";
import { SwipeableMessage } from "./SwipeableMessage";

type Props = {
  roomId: string;
  senderId: string;
  actor: "admin" | "customer";
};

export default function ChatWindow({ roomId, senderId, actor }: Props) {
  const { messagesByRoomId, fetchMessages, sendMessage, markRead, markMessageSeen, rooms, editMessage } = useChatStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const seenOnceRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  type LiteBill = { _id: string; billNumber?: string; totalAmount?: number; createdAt: string };
  type BillUpdate = { result?: { _id?: string; billNumber?: string; totalAmount?: number; createdAt?: string } };
  const [bills, setBills] = useState<LiteBill[]>([]);

  const messages = useMemo(() => messagesByRoomId[roomId] || [], [messagesByRoomId, roomId]);

  const customerId = useMemo(() => {
    const r = (rooms || []).find((x) => x._id === roomId);
    return r?.customer?._id;
  }, [rooms, roomId]);

  useEffect(() => {
    fetchMessages(roomId).then(() => markRead(roomId, actor)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Fetch bills for this room's customer and keep a lightweight list
  useEffect(() => {
    let alive = true;
    if (!customerId) return;
    (async () => {
      try {
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(customerId)}/list`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json?.success && Array.isArray(json.data)) {
          const list: LiteBill[] = (json.data as Array<Record<string, unknown>>).map((b) => ({
            _id: String(b._id as string),
            billNumber: b.billNumber as string | undefined,
            totalAmount: Number((b.totalAmount as number | string | undefined) ?? 0),
            createdAt: String(b.createdAt as string),
          }));
          setBills(list);
        } else {
          setBills([]);
        }
      } catch { setBills([]); }
    })();
    return () => { alive = false; };
  }, [customerId]);

  // Realtime: listen to bill documents for this customer and update timeline immediately
  useEffect(() => {
    if (!customerId) return;
    const sub = sanityClient
      .listen(
        '*[_type == "bill" && customer._ref == $userId]{ _id, billNumber, totalAmount, createdAt }',
        { userId: customerId }
      )
      .subscribe((update: BillUpdate) => {
        const doc = update?.result;
        if (!doc || !doc._id) return;
        setBills((prev) => {
          const idx = prev.findIndex((b) => b._id === String(doc._id));
          const next: LiteBill = {
            _id: String(doc._id),
            billNumber: doc.billNumber,
            totalAmount: Number((doc.totalAmount as number | string | undefined) ?? 0),
            createdAt: String(doc.createdAt ?? new Date().toISOString()),
          };
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          }
          return [...prev, next];
        });
      });
    return () => { try { sub.unsubscribe(); } catch {} };
  }, [customerId]);

  // Auto scroll to bottom on messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Mark messages as seen when 50%+ visible (for messages not sent by self)
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const m of messages) {
      const isSelf = getMsgSenderId(m) === senderId;
      if (isSelf) continue;
      if (m.status === 'seen') continue;
      const msgId = `chatmsg-${m._id}`;
      const el = document.getElementById(msgId);
      if (!el) continue;
      const obs = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            void markMessageSeen(roomId, m._id);
            try { obs.disconnect(); } catch {}
          }
        }
      }, { threshold: [0.5] });
      try { obs.observe(el); } catch {}
      observers.push(obs);
    }
    return () => { observers.forEach(o => { try { o.disconnect(); } catch {} }); };
  }, [messages, senderId, roomId, markMessageSeen]);

  const onSend = async () => {
    const content = text.trim();
    if (!content) return;
    const currentEditing = editingId;
    const currentReply = replyingTo;
    setText("");
    setEditingId(null);
    setReplyingTo(null);
    if (currentEditing) {
      await editMessage(roomId, currentEditing, content);
      return;
    }
    
    // Include parent message details when replying
    const parentMessage = currentReply ? {
      _id: currentReply._id,
      content: currentReply.content,
      sender: currentReply.sender
    } : undefined;
    
    await sendMessage(roomId, content, senderId, actor === "customer", currentReply?._id, parentMessage);
  };

  const getMsgSenderId = (m: ChatMessage): string | undefined => {
    if (!m?.sender) return undefined;
    const s = m.sender as { _id?: string; _ref?: string };
    return s._id ?? s._ref;
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex flex-col grow overflow-y-auto pr-1">
        <div className="space-y-2">
          {(() => {
            type Item = { kind: 'msg'; createdAt: string; m: ChatMessage } | { kind: 'bill'; createdAt: string; b: { _id: string; billNumber?: string; totalAmount?: number } };
            const msgItems: Item[] = messages.map((m) => ({ kind: 'msg', createdAt: m.createdAt as string, m }));
            const billItems: Item[] = bills.map((b) => ({ kind: 'bill', createdAt: b.createdAt, b }));
            const items = [...msgItems, ...billItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            return items.map((it, idx) => {
              if (it.kind === 'bill') {
                const b = it.b;
                return (
                  <div key={`bill-${b._id}-${idx}`} className="flex justify-start">
                    <div className="max-w-[80%] border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <div className="text-sm font-medium">Bill created of ₹{Number(b.totalAmount ?? 0).toLocaleString('en-IN')} </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-xs opacity-70">{new Date(it.createdAt).toLocaleString()}</span>
                        <BillDetailTrigger bill={{ _id: b._id, billNumber: b.billNumber }} buttonLabel="View" />
                      </div>
                    </div>
                  </div>
                );
              }
              const m = it.m;
              const isSelf = getMsgSenderId(m) === senderId;
              const parent = m.parentId ? messages.find((x) => x._id === m.parentId) : undefined;

              const onView = () => {
                if (isSelf) return;
                if (m.status === 'seen') return;
                if (seenOnceRef.current.has(m._id)) return;
                seenOnceRef.current.add(m._id);
                markMessageSeen(roomId, m._id).catch(() => {});
              };

              return (
                <SwipeableMessage
                  key={`m-${m._id}-${idx}`}
                  message={m}
                  isSelf={isSelf}
                  parentMessage={parent}
                  onView={onView}
                  onSwipeLeft={() => {
                    // Swipe left to reply
                    setReplyingTo(m);
                    setEditingId(null);
                    const input = document.getElementById('message-input');
                    input?.focus();
                  }}
                  onSwipeRight={() => {
                    // Swipe right to edit (only for own messages)
                    if (isSelf) {
                      setEditingId(m._id);
                      setReplyingTo(null);
                      setText(m.content as string);
                    }
                  }}
                />
              );
            });
          })()}
          {messages.length === 0 && (
            <div className="border rounded-md p-6 text-center opacity-70">No messages yet</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      {replyTo && (
        <div className="mt-1 border rounded-md p-2 bg-amber-50 dark:bg-zinc-800/60 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Replying to message</div>
            <button className="opacity-70 hover:opacity-100" onClick={() => setReplyTo(null)}>Clear</button>
          </div>
          <div className="mt-1 line-clamp-2 whitespace-pre-wrap opacity-80">{replyTo.content}</div>
        </div>
      )}
      {editingId && (
        <div className="mt-1 border rounded-md p-2 bg-blue-50 dark:bg-zinc-800/60 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Editing message</div>
            <button className="opacity-70 hover:opacity-100" onClick={() => { setEditingId(null); setText(""); }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 border-t p-2 bg-white dark:bg-zinc-900">
        {replyingTo && (
          <div className="absolute bottom-full left-0 right-0 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <div className="truncate max-w-[calc(100%-24px)]">
              <span className="font-medium">Replying to:</span> {replyingTo.content}
            </div>
            <button 
              type="button" 
              onClick={() => setReplyingTo(null)}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        )}
        <input
          id="message-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black" onClick={onSend}>{editingId ? 'Update' : 'Send'}</button>
      </div>
    </div>
  );
}

