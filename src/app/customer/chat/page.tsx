"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";

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

  // auto-scroll to bottom on new messages (hook must appear before any return below)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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

  return (
    <div className="p-4 md:p-6 space-y-4 h-[calc(100vh-65px)] flex flex-col">
      {(!hydrated || initializing) ? (
        <div className="p-6">Loading chat…</div>
      ) : role !== 'customer' ? (
        <div className="p-6">You do not have access to this page.</div>
      ) : (
        <>
          <div className="w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur border rounded-md p-4 mb-2">
            <h1 className="text-xl font-semibold">Chat</h1>
            <p className="text-sm opacity-70">You can message the shop admins here.</p>
          </div>

      <div ref={scrollRef} className="flex-1 overflow-auto pr-1">
        <div className="space-y-2">
          {messages.map((m: ChatMessage, idx: number) => {
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
                      <span className="text-[11px] text-white/80">
                        {m.status === 'seen' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
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
