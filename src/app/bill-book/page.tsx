"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useBillBookStore, type BillMeta, type BillMessage } from "@/store/bill-book-store";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { sanityClient } from "@/lib/sanity";
import BillBookCustomerSidebar from "@/components/billing/bill-book-customer-sidebar";
import { Clock, Check, CheckCheck } from "lucide-react";

function BillBookHeader() {
  const { summary } = useBillBookStore();
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  return (
    <div className="w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur border rounded-md p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Bill Book</h1>
          {summary && (
            <p className="text-sm opacity-80">
              Total: {summary.totalBills} • Paid: ₹{summary.totalPaid.toLocaleString()} • Outstanding: ₹{summary.totalOutstanding.toLocaleString()} • Latest: {summary.latestBillDate ? new Date(summary.latestBillDate).toLocaleString() : "-"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1 text-sm rounded border ${filter === "all" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} onClick={() => setFilter("all")}>All</button>
          <button className={`px-3 py-1 text-sm rounded border ${filter === "paid" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} onClick={() => setFilter("paid")}>Paid</button>
          <button className={`px-3 py-1 text-sm rounded border ${filter === "pending" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} onClick={() => setFilter("pending")}>Pending</button>
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-xs opacity-70 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

type TimelineItem =
  | { type: "bill"; bill: BillMeta; createdAt: string }
  | { type: "message"; billId: string; data: BillMessage; createdAt: string };

function ChatTimeline({ bills, userId, onReply }: { bills: BillMeta[]; userId: string; onReply: (billId: string, msg: BillMessage) => void }) {
  const { messagesByBillId, fetchAllMessages, addOrUpdateMessage, markMessageSeen } = useBillBookStore();
  const { user } = useAuthStore();
  const fetchedRef = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = React.useState<{ billId: string; id: string; text: string } | null>(null);
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set());
  const didInitialScrollRef = React.useRef(false);

  // Single request to load all messages for the selected user (guard against StrictMode double effects)
  useEffect(() => {
    if (!userId) return;
    if (fetchedRef.current === userId) return;
    fetchedRef.current = userId;
    fetchAllMessages(userId);
  }, [userId, fetchAllMessages]);

  const items: TimelineItem[] = React.useMemo(() => {
    const billItems: TimelineItem[] = bills.map((b) => ({ type: "bill", bill: b, createdAt: b.createdAt }));
    const msgItems: TimelineItem[] = bills.flatMap((b) =>
      (messagesByBillId[b._id] || []).map((m) => ({ type: "message", billId: b._id, data: m, createdAt: m.createdAt }))
    );
    return [...billItems, ...msgItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [bills, messagesByBillId]);

  const sections = React.useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = startOfDay(now);
    const ydayStart = todayStart - 24 * 60 * 60 * 1000;
    const today = { label: "Today", list: [] as TimelineItem[] };
    const yesterday = { label: "Yesterday", list: [] as TimelineItem[] };
    const past = { label: "Past", list: [] as TimelineItem[] };
    for (const it of items) {
      const t = new Date(it.createdAt).getTime();
      if (t >= todayStart) today.list.push(it);
      else if (t >= ydayStart) yesterday.list.push(it);
      else past.list.push(it);
    }
    // Show older sections first: Past -> Yesterday -> Today
    return [past, yesterday, today].filter((s) => s.list.length > 0);
  }, [items]);

  // Always auto-scroll to bottom when items change (WhatsApp-like latest at bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Ensure initial landing is bottom-aligned
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      // Use raf + timeout to ensure layout is flushed before scrolling
      const toBottom = () => el.scrollTo({ top: el.scrollHeight });
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        requestAnimationFrame(() => {
          requestAnimationFrame(toBottom);
        });
      } else {
        setTimeout(toBottom, 0);
      }
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items.length]);

  // Support external request to force scroll to bottom (e.g., after send)
  useEffect(() => {
    const handler = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    };
    (window as any).addEventListener?.("billbook-scroll-bottom", handler as EventListener);
    return () => {
      (window as any).removeEventListener?.("billbook-scroll-bottom", handler as EventListener);
    };
  }, []);

  const selfId: string | undefined = (user as any)?._id ?? (user as any)?.id;

  // Mark as seen when a message becomes visible (50%+)
  useEffect(() => {
    if (!selfId) return;
    const observers: IntersectionObserver[] = [];
    for (const b of bills) {
      const list = messagesByBillId[b._id] || [];
      for (const m of list) {
        const el = document.getElementById(`msg-${b._id}-${m._id}`);
        if (!el) continue;
        const alreadySeen = m.status === 'seen' || m.optimistic;
        const recipientRef = typeof m.recipient === 'string' ? m.recipient : (m.recipient as any)?._ref;
        const isForSelf = recipientRef && selfId && recipientRef === selfId;
        if (alreadySeen || !isForSelf) continue;
        const obs = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              void markMessageSeen(b._id, m._id);
              try { obs.disconnect(); } catch {}
            }
          }
        }, { threshold: [0.5] });
        try { obs.observe(el); } catch {}
        observers.push(obs);
      }
    }
    return () => observers.forEach(o => { try { o.disconnect(); } catch {} });
  }, [messagesByBillId, bills, selfId, markMessageSeen]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto pr-1">
      {sections.map((sec) => (
        <div key={sec.label}>
          <DateSeparator label={sec.label} />
          <div className="space-y-2">
            {sec.list.map((it, idx) => {
              if (it.type === "bill") {
                const b = it.bill;
                return (
                  <div key={`b-${b._id}-${idx}`} className="flex">
                    <div className="max-w-[80%] border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <div className="text-sm font-medium">Bill created of ₹{Number(b.totalAmount ?? 0).toLocaleString()}</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-xs opacity-70">{new Date(b.createdAt).toLocaleString()}</span>
                        <BillDetailTrigger bill={{ _id: b._id, billNumber: b.billNumber }} buttonLabel="View" />
                      </div>
                    </div>
                  </div>
                );
              }
              const m = it.data;
              let isSelf = false;
              const s: any = (m as any)?.sender;
              if (typeof s === "string") {
                isSelf = s === "self";
              } else if (s && typeof s === "object" && "_ref" in s && selfId) {
                // Logged-in user's messages on right
                isSelf = s._ref === selfId;
              }
              const isEditing = editing && editing.id === m._id && editing.billId === it.billId;
              // Lookup parent for reply preview
              const parent = m.parentId ? (messagesByBillId[it.billId] || []).find((pm) => pm._id === m.parentId) : undefined;
              return (
                <div id={`msg-${it.billId}-${m._id}`} key={`m-${m._id}-${idx}`} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group max-w-[75%] text-sm px-3 py-2 border shadow-sm ${
                      isSelf
                        ? "bg-emerald-600/90 text-white border-emerald-700 rounded-2xl rounded-br-sm"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-white/90 dark:text-zinc-100 rounded-2xl rounded-bl-sm"
                    }`}
                  >
                    {!isEditing ? (
                      <>
                        {parent && (
                          <div className={`mb-1 text-xs rounded-md p-2 border-l-2 ${isSelf ? 'border-white/60 bg-white/10' : 'border-zinc-400 bg-black/10'} truncate`}
                               title={parent.content}>
                            <span className={isSelf ? 'text-white/90' : 'text-zinc-200'}>{parent.content}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        <div className={`mt-1 flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          {isSelf && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80">
                              {m.optimistic || updatingIds.has(m._id) ? (
                                <Clock className="w-3 h-3" />
                              ) : m.status === 'seen' ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                          <span className={`text-[11px] ${isSelf ? 'text-white/80' : 'opacity-70'}`}>{new Date(m.createdAt).toLocaleString()}</span>
                          {/* Reply action for any message */}
                          <button
                            type="button"
                            onClick={() => onReply(it.billId, m)}
                            className={`opacity-0 group-hover:opacity-100 text-[11px] underline underline-offset-2 ${isSelf ? 'text-white' : ''}`}
                            title="Reply"
                          >
                            Reply
                          </button>
                          {isSelf && (
                            <button
                              type="button"
                              onClick={() => setEditing({ billId: it.billId, id: m._id, text: m.content })}
                              className={`opacity-0 group-hover:opacity-100 text-[11px] underline underline-offset-2 ${isSelf ? 'text-white' : ''}`}
                              title="Edit"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!editing) return;
                          const payload = { content: editing.text };
                          // Close edit immediately and show updating clock optimistically
                          setUpdatingIds((s) => new Set([...s, editing.id]));
                          setEditing(null);
                          try {
                            const res = await fetch(`/api/bill-book/bill/${encodeURIComponent(editing.billId)}/messages/${encodeURIComponent(editing.id)}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            }).then(r => r.json());
                            if (!res?.success) throw new Error(res?.error || 'Failed to update');
                            addOrUpdateMessage(editing.billId, res.data);
                            try { window.dispatchEvent(new Event('billbook-scroll-bottom')); } catch {}
                          } catch (err) {
                            // no-op: you can add toast here
                          } finally {
                            setUpdatingIds((s) => { const n = new Set(s); n.delete((editing as any)?.id); return n; });
                          }
                        }}
                        className="space-y-2"
                      >
                        <textarea
                          value={editing?.text || ''}
                          onChange={(e) => setEditing((s) => (s ? { ...s, text: e.target.value } : s))}
                          rows={3}
                          className="w-full border rounded-md bg-transparent p-2"
                          autoFocus
                        />
                        <div className={`flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <button type="submit" className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Save</button>
                          <button type="button" onClick={() => setEditing(null)} className="px-2 py-1 text-xs rounded border">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {sections.length === 0 && (
        <div className="border rounded-md p-6 text-center opacity-70">No messages</div>
      )}
    </div>
  );
}

function MessageComposer({ billId, recipientId, parentId, onCancelReply, replyPreview }: { billId: string; recipientId: string; parentId?: string | null; onCancelReply?: () => void; replyPreview?: string }) {
  const { sendMessage } = useBillBookStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 flex items-center gap-2 border rounded-md p-2 bg-white/60 dark:bg-zinc-900/60"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        try {
          await sendMessage(billId, { content: text.trim(), recipientId, parentId: parentId || undefined });
          setText("");
          if (onCancelReply) onCancelReply();
          try {
            // Notify timeline to scroll to bottom smoothly
            const ev = new Event("billbook-scroll-bottom");
            window.dispatchEvent(ev);
          } catch {}
        } finally {
          setBusy(false);
        }
      }}
    >
      {parentId && (
        <div className="w-full mb-2 px-2 py-1 text-xs rounded border bg-zinc-50 dark:bg-zinc-800 truncate">
          Replying to: <span className="opacity-80">{replyPreview?.slice(0, 80) || 'message'}</span>
          {onCancelReply && (
            <button type="button" onClick={onCancelReply} className="ml-2 underline">Cancel</button>
          )}
        </div>
      )}
      <input
        className="flex-1 border rounded px-3 py-2 bg-transparent"
        placeholder="Write a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        disabled={busy}
        className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}

export default function BillBookPage() {
  const search = useSearchParams();
  const { user, role, hydrated } = useAuthStore();
  const selectedUserId = useMemo(() => {
    const persistedUserId = user?.id ?? ((user as unknown as { _id?: string } | null)?._id);
    if (role === "admin") return (search?.get("userId") || persistedUserId) as string | undefined;
    if (role === "customer") return persistedUserId as string | undefined;
    return undefined;
  }, [search, role, user]);

  const bills = useBillBookStore((s) => s.bills as BillMeta[]);
  const fetchBillBook = useBillBookStore((s) => s.fetchBillBook);
  const messagesByBillId = useBillBookStore((s) => s.messagesByBillId);
  const fetchAllMessages = useBillBookStore((s) => s.fetchAllMessages);
  const [reply, setReply] = useState<{ billId: string; message: BillMessage } | null>(null);

  useEffect(() => {
    if (!hydrated || !role) return;
    if (!selectedUserId) return;
    fetchBillBook(selectedUserId);
  }, [hydrated, role, selectedUserId, fetchBillBook]);

  // Realtime: refresh when bills or messages change for the selected user
  useEffect(() => {
    if (!selectedUserId) return;
    let billsTimer: any = null;
    let msgsTimer: any = null;
    const scheduleBills = () => {
      clearTimeout(billsTimer);
      billsTimer = setTimeout(() => fetchBillBook(selectedUserId), 150);
    };
    const scheduleMsgs = () => {
      clearTimeout(msgsTimer);
      msgsTimer = setTimeout(() => fetchAllMessages(selectedUserId), 150);
    };
    const billSub = sanityClient
      .listen('*[_type == "bill" && customer._ref == $userId]', { userId: selectedUserId })
      .subscribe(() => scheduleBills());
    const msgSub = sanityClient
      .listen('*[_type == "billMessage" && bill->customer._ref == $userId]', { userId: selectedUserId })
      .subscribe(() => scheduleMsgs());
    return () => {
      try { billSub?.unsubscribe?.(); } catch {}
      try { msgSub?.unsubscribe?.(); } catch {}
      clearTimeout(billsTimer); clearTimeout(msgsTimer);
    };
  }, [selectedUserId, fetchBillBook, fetchAllMessages]);

  if (!hydrated) return <div className="p-6">Loading...</div>;
  if (!role) return <div className="p-6">Please login to access Bill Book.</div>;

  // Admin: Chat-like two-column layout with single chat thread
  if (role === "admin") {
    // Determine latest bill for sending new messages
    const latestBill = [...bills].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const recipientId = selectedUserId as string | undefined;
    return (
      <div className="p-0 md:p-0 h-[100dvh]">
        <div className="grid grid-cols-12 h-full">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3 border-r border-zinc-200 dark:border-zinc-800 h-full overflow-hidden">
            <BillBookCustomerSidebar selectedUserId={selectedUserId} />
          </aside>
          {/* Content */}
          <main className="col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-9 h-full overflow-hidden">
            <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
              <BillBookHeader />
              <ChatTimeline bills={bills} userId={selectedUserId as string} onReply={(billId, msg) => setReply({ billId, message: msg })} />
              <div className="pt-2">
                {latestBill && recipientId ? (
                  <MessageComposer
                    billId={latestBill._id}
                    recipientId={recipientId}
                    parentId={reply?.billId === latestBill._id ? reply?.message?._id : undefined}
                    replyPreview={reply?.billId === latestBill._id ? reply?.message?.content : undefined}
                    onCancelReply={() => setReply(null)}
                  />
                ) : (
                  <div className="text-sm opacity-70 border rounded-md p-3">Create a bill to start messaging.</div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Customer: keep single column
  // Customer view: single chat as well
  const latestBill = [...bills].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const recipientId = selectedUserId as string | undefined;
  return (
    <div className="p-4 md:p-6 space-y-4 h-[calc(100vh-65px)] flex flex-col">
      <BillBookHeader />
      <ChatTimeline bills={bills} userId={selectedUserId as string} onReply={(billId, msg) => setReply({ billId, message: msg })} />
      <div className="pt-2">
        {latestBill && recipientId ? (
          <MessageComposer
            billId={latestBill._id}
            recipientId={recipientId}
            parentId={reply?.billId === latestBill._id ? reply?.message?._id : undefined}
            replyPreview={reply?.billId === latestBill._id ? reply?.message?.content : undefined}
            onCancelReply={() => setReply(null)}
          />
        ) : (
          <div className="text-sm opacity-70 border rounded-md p-3">Create a bill to start messaging.</div>
        )}
      </div>
    </div>
  );
}
