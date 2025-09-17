"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { sanityClient } from "@/lib/sanity";
import { SwipeableMessage } from "@/components/chat/SwipeableMessage";
import { motion } from "framer-motion";

export default function CustomerChatPage() {
  const { user, role, hydrated } = useAuthStore();
  const { openRoomByCustomer, setActiveRoom, activeRoomId, subscribeRealtime, messagesByRoomId, fetchMessages, sendMessage, markRead, markMessageSeen } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const customerId = useMemo(() => {
    const u = user as { id?: string; _id?: string } | null;
    // For chat participants and references, we must use the Sanity user document _id (or fallback to id if that's already the Sanity id)
    return u?._id || u?.id || undefined;
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    // enable realtime like admin
    subscribeRealtime();
    if (role !== "customer" || !customerId) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        const roomId = await openRoomByCustomer(String(customerId));
        await setActiveRoom(roomId);
        await fetchMessages(roomId);
        await markRead(roomId, "customer");
      } finally {
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, role, customerId]);

  const senderId = customerId ? String(customerId) : undefined;
  const messages: ChatMessage[] = React.useMemo(() => {
    return activeRoomId ? ((messagesByRoomId[activeRoomId] || []) as ChatMessage[]) : ([] as ChatMessage[]);
  }, [activeRoomId, messagesByRoomId]);

  type LiteBill = { _id: string; billNumber?: string; totalAmount?: number; createdAt: string };
  type BillUpdate = { result?: { _id?: string; billNumber?: string; totalAmount?: number; createdAt?: string } };
  const [bills, setBills] = useState<LiteBill[]>([]);

  // auto-scroll to bottom on new messages (hook must appear before any return below)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, bills.length]);

  // Mark messages as seen when 50%+ visible (for messages not sent by self)
  useEffect(() => {
    if (!activeRoomId) return;
    const observers: IntersectionObserver[] = [];
    for (const m of messages) {
      const sender = (m?.sender as { _id?: string; _ref?: string } | undefined);
      const isSelf = !!senderId && (sender?._id === senderId || sender?._ref === senderId);
      if (isSelf) continue;
      if (m.status === "seen") continue;
      const msgId = `chatmsg-${m._id}`;
      const el = document.getElementById(msgId);
      if (!el) continue;
      const obs = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            void markMessageSeen(activeRoomId, m._id);
            try { obs.disconnect(); } catch {}
          }
        }
      }, { threshold: [0.5] });
      try { obs.observe(el); } catch {}
      observers.push(obs);
    }
    return () => { observers.forEach(o => { try { o.disconnect(); } catch {} }); };
  }, [activeRoomId, messages, senderId, markMessageSeen]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !senderId) return;
    if (sending) return;
    const content = text.trim();
    if (!content) return;
    
    setSending(true);
    try {
      if (editingId) {
        // Edit existing message
        await useChatStore.getState().editMessage(activeRoomId, editingId, content);
        setEditingId(null);
      } else {
        // Send new message or reply
        await sendMessage(
          activeRoomId, 
          content, 
          senderId, 
          true, // isCustomer
          replyingTo?._id, // parentId
          replyingTo ? {
            _id: replyingTo._id,
            content: replyingTo.content,
            sender: replyingTo.sender
          } : undefined // parentMessage
        );
        setReplyingTo(null);
      }
      setText("");
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Fetch and subscribe to bills for this customer so they appear inline in the chat
  useEffect(() => {
    let alive = true;
    if (!customerId) return;
    (async () => {
      try {
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(String(customerId))}/list`, { cache: 'no-store' });
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
        } else setBills([]);
      } catch { setBills([]); }
    })();
    const sub = sanityClient
      .listen('*[_type == "bill" && customer._ref == $userId]{ _id, billNumber, totalAmount, createdAt }', { userId: String(customerId) })
      .subscribe((update: BillUpdate) => {
        const doc = update?.result;
        if (!doc || !doc._id) return;
        setBills((prev) => {
          const idx = prev.findIndex((b) => b._id === String(doc._id));
          const next: LiteBill = { _id: String(doc._id), billNumber: doc.billNumber, totalAmount: Number((doc.totalAmount as number | string | undefined) ?? 0), createdAt: String(doc.createdAt ?? new Date().toISOString()) };
          if (idx >= 0) { const copy = [...prev]; copy[idx] = next; return copy; }
          return [...prev, next];
        });
      });
    return () => { alive = false; try { sub.unsubscribe(); } catch {} };
  }, [customerId]);

  return (
    <div className="-mt-3 xl:-mt-10 space-y-4 h-[calc(100vh-85px)] md:h-[calc(100dvh-140px)] flex flex-col">
      {(!hydrated || initializing) ? (
        <div className="p-6">Loading chat…</div>
      ) : role !== 'customer' ? (
        <div className="p-6">You do not have access to this page.</div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-auto pr-1">
            <div className="space-y-2">
              {(() => {
                type Item = { kind: 'msg'; createdAt: string; m: ChatMessage } | { kind: 'bill'; createdAt: string; b: LiteBill };
                const msgItems: Item[] = messages.map((m) => ({ 
                  kind: 'msg' as const, 
                  createdAt: m.createdAt as string, 
                  m 
                }));
                const billItems: Item[] = bills.map((b) => ({ 
                  kind: 'bill' as const, 
                  createdAt: b.createdAt, 
                  b 
                }));
                const items = [...msgItems, ...billItems].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );

                if (items.length === 0) {
                  return (
                    <div className="border rounded-md p-6 text-center opacity-70">
                      No messages yet
                    </div>
                  );
                }

                return items.map((it, idx) => {
                  if (it.kind === 'bill') {
                    const b = it.b;
                    return (
                      <div key={`bill-${b._id}-${idx}`} className="flex justify-start">
                        <div className="max-w-[80%] border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                          <BillDetailTrigger bill={{
                            _id: b._id,
                            billNumber: b.billNumber || '',
                            totalAmount: b.totalAmount || 0,
                            createdAt: b.createdAt,
                            status: 'completed' // Default status since it's required
                          }}>
                            <div className="text-sm font-medium">Bill #{b.billNumber}</div>
                            <div className="text-sm">₹{b.totalAmount?.toFixed(2)}</div>
                          </BillDetailTrigger>
                        </div>
                      </div>
                    );
                  }
                  
                  // It's a message
                  const m = it.m;
                  const isSelf = !!senderId && (() => {
                    const s = m?.sender as { _id?: string; _ref?: string } | undefined;
                    return s?._id === senderId || s?._ref === senderId;
                  })();
                  
                  // Find parent message for replies
                  const parent = m.parentId ? messages.find(msg => msg._id === m.parentId) : null;
                  
                  return (
                    <div key={m._id} id={`chatmsg-${m._id}`} className={isSelf ? 'text-right' : 'text-left'}>
                      <SwipeableMessage 
                        message={m} 
                        isSelf={isSelf}
                        parentMessage={parent}
                        onSwipeLeft={() => {
                          setReplyingTo(m);
                          setEditingId(null);
                          inputRef.current?.focus();
                        }}
                        onSwipeRight={() => {
                          if (!isSelf) return;
                          setEditingId(m._id);
                          setReplyingTo(null);
                          setText(m.content as string);
                          inputRef.current?.focus();
                        }}
                        onView={() => {
                          // Handle view action if needed
                        }}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {(replyingTo || editingId) && (
            <div className="px-4 pt-2 border-t dark:border-zinc-700">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 text-sm flex justify-between items-center">
                <div className="truncate">
                  {editingId ? (
                    <span>Editing message</span>
                  ) : replyingTo ? (
                    <>
                      <span className="text-emerald-500">Replying to: </span>
                      <span className="text-zinc-400 truncate">
                        {typeof replyingTo.content === 'string' ? 
                          replyingTo.content.slice(0, 50) + 
                          (replyingTo.content.length > 50 ? '...' : '') : ''}
                      </span>
                    </>
                  ) : null}
                </div>
                <button 
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingId(null);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form onSubmit={onSend} className="flex gap-2 p-4 border-t dark:border-zinc-700">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={editingId ? "Edit your message..." : "Type a message..."}
                className="w-full p-2 pl-3 pr-10 rounded-lg border dark:border-zinc-700 dark:bg-zinc-800 text-white"
              />
            </div>
            <motion.button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              {sending ? 'Sending...' : editingId ? 'Update' : 'Send'}
            </motion.button>
          </form>
        </>
      )}
    </div>
  );
}
