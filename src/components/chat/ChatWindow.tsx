"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { sanityClient } from "@/lib/sanity";
import type { ChatMessage } from "@/lib/chat-api";

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

  const onSend = async () => {
    const content = text.trim();
    if (!content) return;
    const currentEditing = editingId;
    const currentReply = replyTo;
    setText("");
    setEditingId(null);
    setReplyTo(null);
    if (currentEditing) {
      await editMessage(roomId, currentEditing, content);
      return;
    }
    await sendMessage(roomId, content, senderId, actor === "customer", currentReply?._id);
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
            return items.map((it) => {
              if (it.kind === 'bill') {
                const b = it.b;
                return (
                  <div key={`bill-${b._id}`} className="flex justify-start">
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
            const onEnterView = () => {
              if (isSelf) return;
              if (m.status === 'seen') return;
              if (seenOnceRef.current.has(m._id)) return;
              seenOnceRef.current.add(m._id);
              markMessageSeen(roomId, m._id).catch(() => {});
            };
            // Attach an id for potential viewport observers if needed
            const msgId = `chatmsg-${m._id}`;
            const parent = m.parentId ? messages.find((x) => x._id === m.parentId) : undefined;
            return (
              <div id={msgId} key={m._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`} onMouseEnter={onEnterView}>
                <div className={`group relative max-w-[75%] text-sm px-3 py-2 border shadow-sm ${isSelf ? 'bg-emerald-600/90 text-white border-emerald-700 rounded-2xl rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-white/90 dark:text-zinc-100 rounded-2xl rounded-bl-sm'}`}>
                  {parent && (
                    <div className={`mb-1 border-l-2 pl-2 text-xs ${isSelf ? 'border-white/40 text-white/85' : 'border-zinc-400 text-zinc-200'}`}>
                      <div className="opacity-80">Replying to</div>
                      <div className="line-clamp-2 whitespace-pre-wrap opacity-90">{parent.content}</div>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  <div className={`mt-1 flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[11px] ${isSelf ? 'text-white/80' : 'opacity-70'}`}>{new Date(m.createdAt).toLocaleString()}</span>
                    {m.editedAt && <span className={`text-[10px] italic ${isSelf ? 'text-white/70' : 'opacity-60'}`}>(edited)</span>}
                    {isSelf && (
                      <span className="inline-flex items-center gap-1">
                        {m.status === 'seen' ? (
                          <CheckCheck className="w-3 h-3 text-sky-300" />
                        ) : m.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3 text-white/80" />
                        ) : (
                          <Check className="w-3 h-3 text-white/80" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className={`absolute -top-2 ${isSelf ? '-left-1' : '-right-1'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  <div className={`mt-1 hidden group-hover:flex gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <button
                      className={`text-xs underline ${isSelf ? 'text-white/90' : 'text-zinc-300'}`}
                      onClick={() => setReplyTo(m)}
                    >Reply</button>
                    {isSelf && (
                      <button
                        className={`text-xs underline ${isSelf ? 'text-white/90' : 'text-zinc-300'}`}
                        onClick={() => { setEditingId(m._id); setText(m.content); setReplyTo(null); }}
                      >Edit</button>
                    )}
                  </div>
                </div>
              </div>
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
      <div className="mt-1 flex items-center gap-2 border rounded-md p-2 bg-white/60 dark:bg-zinc-900/60">
        <input
          className="flex-1 border rounded px-3 py-2 bg-transparent"
          placeholder={editingId ? "Edit your message..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
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


