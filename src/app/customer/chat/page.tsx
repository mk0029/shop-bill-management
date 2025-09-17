"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { sanityClient } from "@/lib/sanity";

export default function CustomerChatPage() {
  const { user, role, hydrated } = useAuthStore();
  const { openRoomByCustomer, setActiveRoom, activeRoomId, subscribeRealtime, messagesByRoomId, fetchMessages, sendMessage, markRead, markMessageSeen } = useChatStore();
  const [initializing, setInitializing] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

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
    setText("");
    setSending(true);
    await sendMessage(activeRoomId, content, senderId, true).catch(() => {});
    setSending(false);
    try { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); } catch {}
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
    <div className=" -mt-3 xl:-mt-10 space-y-4 h-[calc(100vh-85px)]  md:h-[calc(100dvh-140px)] flex flex-col">
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
                const msgItems: Item[] = messages.map((m) => ({ kind: 'msg', createdAt: m.createdAt as string, m }));
                const billItems: Item[] = bills.map((b) => ({ kind: 'bill', createdAt: b.createdAt, b }));
                const items = [...msgItems, ...billItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                return items.map((it, idx) => {
                  if (it.kind === 'bill') {
                    const b = it.b;
                    return (
                      <div key={`bill-${b._id}-${idx}`} className="flex justify-start">
                        <div className="max-w-[80%] border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                          <div className="text-sm font-medium">Bill created of ₹{Number(b.totalAmount ?? 0).toLocaleString('en-IN')}</div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="text-xs opacity-70">{new Date(it.createdAt).toLocaleString()}</span>
                            <BillDetailTrigger bill={{ _id: b._id, billNumber: b.billNumber }} buttonLabel="View" />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const m = it.m;
                  const sender = (m?.sender as { _id?: string; _ref?: string } | undefined);
                  const isSelf = !!senderId && (sender?._id === senderId || sender?._ref === senderId);
                  const msgId = `chatmsg-${m._id}`;
                  return (
                    <div id={msgId} key={`m-${m._id}-${idx}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group max-w-[75%] text-sm px-3 py-2 border shadow-sm ${isSelf ? 'bg-emerald-600/90 text-white border-emerald-700 rounded-2xl rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-white/90 dark:text-zinc-100 rounded-2xl rounded-bl-sm'}`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        <div className={`mt-1 flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[11px] ${isSelf ? 'text-white/80' : 'opacity-70'}`}>{new Date(m.createdAt as string).toLocaleString()}</span>
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
                      </div>
                    </div>
                  );
                });
              })()}
              {(messages.length === 0 && bills.length === 0) && (
                <div className="border rounded-md p-6 text-center opacity-70">No messages yet</div>
              )}
            </div>
          </div>
          <form onSubmit={onSend} className="mt-1 flex items-center gap-2 border rounded-md p-2 bg-white/60 dark:bg-zinc-900/60">
            <input className="flex-1 border rounded px-3 py-2 bg-transparent" placeholder="Write a message..." value={text} onChange={(e) => setText(e.target.value)} disabled={sending} />
            <button disabled={sending} className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50">{sending ? 'Sending…' : 'Send'}</button>
          </form>
        </>
      )}
    </div>
  );
}
