"use client";

import React, { useMemo, useCallback, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubbleSourceAdapter from "@/components/chat/MessageBubbleSourceAdapter";
import { BillDetailTrigger } from "../bills/bill-detail-trigger";
import type { ChatMessage } from "@/lib/chat-api";
import { ChevronDown, Edit, Eye } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";

type LiteBill = {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  createdAt: string;
  paymentStatus?: string;
  status?: string;
  paidAmount?: number;
  balanceAmount?: number;
};

// Utility function to format date headers
const getFormattedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-GB");
};

type Props = {
  messages: ChatMessage[];
  bills: LiteBill[];
  roomId: string;
  senderId: string;
  actor: "admin" | "customer";
  rooms: any[];
  uploadProgress: Record<string, number>;
  registerMessageRef: (messageId: string, element: HTMLElement | null) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  typingText?: string;
  initialLoading?: boolean;
};

export default function MessageList({
  messages,
  bills,
  roomId,
  senderId,
  actor,
  rooms,
  uploadProgress,
  registerMessageRef,
  onReply,
  onEdit,
  typingText,
  initialLoading = false,
}: Props) {
  const reactMessage = useChatStore((s) => s.reactMessage);
  const user = useAuthStore((s) => s.user as { id?: string; _id?: string; name?: string } | null);
  const myUserId = String(user?._id || user?.id || "");
  const myUserName = user?.name || "User";

  const handleCopyMessage = useCallback(async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text || "");
      }
    } catch {}
  }, []);

  const activeRoomData = useMemo(() => rooms.find((r) => r._id === roomId), [rooms, roomId]);
  const unreadCount = useMemo(() => {
    if (!activeRoomData) return 0;
    return actor === "admin"
      ? Number(activeRoomData.unreadForAdmins || 0)
      : Number(activeRoomData.unreadForCustomer || 0);
  }, [activeRoomData, actor]);
  const firstUnreadId = useMemo(() => {
    if (!unreadCount || !messages.length) return null;
    const index = Math.max(0, messages.length - unreadCount);
    return messages[index]?._id || null;
  }, [messages, unreadCount]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScrollNext, setAutoScrollNext] = useState(true);

  useEffect(() => {
    if (!autoScrollNext || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, autoScrollNext]);

  useEffect(() => {
    if (!typingText || !autoScrollNext || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typingText, autoScrollNext]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const publishViewport = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom <= 150;
      setShowScrollButton(!isNearBottom);
      setAutoScrollNext(isNearBottom);
    };

    const handleScroll = () => {
      publishViewport();
    };

    publishViewport();
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!autoScrollNext) return;
      el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoScrollNext]);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setShowScrollButton(false);
    setAutoScrollNext(true);
  }, []);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    type MessageItem = {
      kind: "msg";
      createdAt: string;
      m: ChatMessage;
    };

    type BillItem = {
      kind: "bill";
      createdAt: string;
      b: LiteBill;
    };

    type GroupedItem = MessageItem | BillItem;

    const groups: Record<string, GroupedItem[]> = {};

    const msgItems: MessageItem[] = messages.map((m) => ({
      kind: "msg" as const,
      createdAt: m.createdAt as string,
      m,
    }));

    const billItems: BillItem[] = bills.map((b) => ({
      kind: "bill" as const,
      createdAt: b.createdAt,
      b,
    }));

    const allItems = [...msgItems, ...billItems].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    allItems.forEach((item) => {
      const dateKey = new Date(item.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      formattedDate: getFormattedDate(date),
      items: items.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    }));
  }, [messages, bills]);

  // Helper: compute normalized bill status
  const getBillStatus = useCallback((b: LiteBill): string => {
    const stored = (b.paymentStatus || b.status || "").toLowerCase();
    if (stored) {
      if (stored === "draft") return "pending";
      return stored;
    }
    const total = Number(b.totalAmount || 0);
    const paid = Number(b.paidAmount || 0);
    const bal =
      b.balanceAmount != null ? Number(b.balanceAmount) : total - paid;
    if (Number.isFinite(bal)) {
      if (bal <= 0) return "paid";
      if (bal > 0 && paid > 0) return "partial";
      return "pending";
    }
    if (total > 0 && paid >= total) return "paid";
    if (paid > 0 && paid < total) return "partial";
    return "pending";
  }, []);

  // Helper: get Tailwind classes for bill status
  const getBillStatusClasses = useCallback(
    (b: LiteBill) => {
      const raw = getBillStatus(b);
      if (raw === "paid") {
        return {
          container:
            "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700",
          textMuted: "text-emerald-700 dark:text-emerald-300",
          button:
            "border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white",
          title: "text-emerald-900 dark:text-emerald-200",
          badge: "bg-emerald-600 text-white",
          badgeText: "PAID",
        } as const;
      }
      if (raw === "partial") {
        return {
          container:
            "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
          textMuted: "text-orange-700 dark:text-orange-300",
          button:
            "border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-600 hover:text-white",
          title: "text-orange-900 dark:text-orange-200",
          badge: "bg-orange-500 text-white",
          badgeText: "PARTIAL",
        } as const;
      }
      if (raw === "pending") {
        return {
          container:
            "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700",
          textMuted: "text-yellow-700 dark:text-yellow-300",
          button:
            "border-yellow-500 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-600 hover:text-white",
          title: "text-yellow-900 dark:text-yellow-200",
          badge: "bg-yellow-500 text-black",
          badgeText: "PENDING",
        } as const;
      }
      if (raw === "due" || raw === "overdue") {
        return {
          container:
            "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
          textMuted: "text-red-700 dark:text-red-300",
          button:
            "border-red-500 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white",
          title: "text-red-900 dark:text-red-200",
          badge: "bg-red-600 text-white",
          badgeText: "DUE",
        } as const;
      }
      return {
        container:
          "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
        textMuted: "text-zinc-500 dark:text-zinc-400",
        button:
          "border-zinc-400 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-700 hover:text-white",
        title: "text-zinc-900 dark:text-zinc-100",
        badge: "bg-zinc-600 text-white",
        badgeText: "BILL",
      } as const;
    },
    [getBillStatus],
  );

  const getMsgSenderId = (m: ChatMessage): string | undefined => {
    if (!m?.sender) return undefined;
    const s = m.sender as { _id?: string; _ref?: string };
    return s._id ?? s._ref;
  };

  return (
    <div className="relative flex-1 min-h-0 overflow-x-hidden">
      <div
        ref={scrollRef}
        id="messages-scroll"
        className="no-scrollbar mx-auto h-full min-h-0 w-full max-w-[1400px] space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-3 md:px-4 md:py-3"
      >
      {groupedMessages.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`}>
          <div className="sticky top-0 z-30 mb-2 flex justify-center">
            <div className="rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm backdrop-blur">
              {group.formattedDate}
            </div>
          </div>
          {group.items.map((item, idx) => {
            const getMessageGroupPosition = (
              currentIdx: number,
            ): "single" | "first" | "middle" | "last" => {
              const currentItem = group.items[currentIdx];
              if (currentItem.kind !== "msg") return "single";

              const currentMsg = currentItem.m;
              const currentSenderId = getMsgSenderId(currentMsg);

              const prevItem =
                currentIdx > 0 ? group.items[currentIdx - 1] : null;
              const prevMsg = prevItem?.kind === "msg" ? prevItem.m : null;
              const prevSenderId = prevMsg ? getMsgSenderId(prevMsg) : null;
              const hasPrevSameSender = prevSenderId === currentSenderId;

              const nextItem =
                currentIdx < group.items.length - 1
                  ? group.items[currentIdx + 1]
                  : null;
              const nextMsg = nextItem?.kind === "msg" ? nextItem.m : null;
              const nextSenderId = nextMsg ? getMsgSenderId(nextMsg) : null;
              const hasNextSameSender = nextSenderId === currentSenderId;

              if (!hasPrevSameSender && !hasNextSameSender) return "single";
              if (!hasPrevSameSender && hasNextSameSender) return "first";
              if (hasPrevSameSender && hasNextSameSender) return "middle";
              if (hasPrevSameSender && !hasNextSameSender) return "last";

              return "single";
            };

            if (item.kind === "bill") {
              const b = item.b;
              const status = getBillStatus(b);
              const billCls = getBillStatusClasses(b);
              const total = Number(b.totalAmount ?? 0);
              const paid = Number(b.paidAmount ?? 0);
              const due = Number(
                b.balanceAmount != null
                  ? b.balanceAmount
                  : Math.max(0, total - paid),
              );
              const buttonLabel =
                actor === "admin" ? (
                  status === "paid" ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <Edit className="w-4 h-4" />
                  )
                ) : status === "paid" ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  "Pay Now"
                );

              return (
                <div
                  key={`bill-${b._id}-${idx}`}
                  className="flex justify-start w-full"
                >
                  <div
                    className={`max-w-[90%] md:max-w-[80%] border rounded-md p-1 sm:p-3 ${billCls.container}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-sm font-semibold ${billCls.title}`}
                        >
                          Bill Created of ₹
                          {Number(b.totalAmount ?? 0).toLocaleString("en-IN")}
                        </div>
                        {/* <div className={`text-xs ${billCls.textMuted}`}>
                          {new Date(item.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div> */}
                        {status === "partial" && (
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="font-medium text-emerald-600 dark:text-emerald-300">
                              Paid ₹{paid.toLocaleString("en-IN")}
                            </span>
                            <span className="opacity-50">•</span>
                            <span className="font-medium text-orange-600 dark:text-orange-300">
                              Due ₹{due.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        {status === "pending" && due > 0 && (
                          <div className="mt-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                            Pending ₹{due.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <BillDetailTrigger
                          bill={b}
                          buttonLabel={buttonLabel}
                          variant="outline"
                          size="sm"
                          className={`h-8 ${billCls.button}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const m = item.m;
            if (!m) return null;

            const groupPosition = getMessageGroupPosition(idx);
            const msgSenderId = getMsgSenderId(m);
            let isSelf: boolean;

            if (actor === "admin") {
              const room = rooms.find((r) => r._id === roomId);
              const customerId = room?.customer?._id;
              const isFromCustomer = msgSenderId === customerId;
              isSelf = !isFromCustomer;
            } else {
              isSelf = msgSenderId === senderId;
            }

            const room = rooms.find((r) => r._id === roomId);
            const customerId = room?.customer?._id;
            const isFromCustomer = msgSenderId === customerId;

            const adminSenders = messages
              .filter((msg) => {
                const sId = getMsgSenderId(msg);
                return sId && sId !== customerId;
              })
              .map((msg) => getMsgSenderId(msg))
              .filter((id, index, arr) => arr.indexOf(id) === index);

            const hasMultipleAdmins = adminSenders.length > 1;
            const shouldShowSenderName = hasMultipleAdmins && !isFromCustomer;

            let senderName: string | undefined;
            if (shouldShowSenderName && m.sender) {
              const sender = m.sender as {
                _id?: string;
                _ref?: string;
                name?: string;
              };
              senderName = sender.name || `Admin ${msgSenderId?.slice(-4)}`;
            }
            const parent = m.parentId
              ? messages.find((x) => x._id === m.parentId)
              : undefined;

            return (
              <motion.div
                key={`m-${m._id}-${idx}`}
                ref={(el) => registerMessageRef(m._id, el)}
                data-message-id={m._id}
                className={
                  groupPosition === "single" || groupPosition === "first"
                    ? "mt-2"
                    : "mt-0.5"
                }
                initial={{
                  opacity: 0,
                  x: isSelf ? 100 : -100,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                  delay: idx * 0.05,
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                }}
                whileInView={{
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.3, ease: "easeOut" },
                }}
                viewport={{ once: false, margin: "-50px" }}
              >
                {firstUnreadId && firstUnreadId === m._id && unreadCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 py-2"
                  >
                    <div className="h-px flex-1 bg-emerald-500/30" />
                    <div className="bg-gray-900 px-2 text-xs text-emerald-400">
                      {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                    </div>
                    <div className="h-px flex-1 bg-emerald-500/30" />
                  </motion.div>
                )}
                <MessageBubbleSourceAdapter
                  message={m}
                  prev={idx > 0 && group.items[idx - 1].kind === "msg" ? group.items[idx - 1].m : null}
                  next={idx < group.items.length - 1 && group.items[idx + 1].kind === "msg" ? group.items[idx + 1].m : null}
                  isSelf={isSelf}
                  onReply={onReply}
                  onEdit={isSelf ? onEdit : undefined}
                />
              </motion.div>
            );
          })}
        </div>
      ))}
      {messages.length === 0 && (
        <div className="border rounded-md p-6 text-center opacity-70">
          No messages yet
        </div>
      )}
      {initialLoading && messages.length === 0 && (
        <div className="space-y-2 px-1 py-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`msg-skeleton-${idx}`}
              className={`flex ${idx % 3 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`animate-pulse rounded-2xl border border-slate-700/70 bg-slate-800/70 ${idx % 3 === 0 ? "w-28" : "w-40"} h-10`}
              />
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {typingText && (
          <motion.div
            key="typing-indicator-chat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.11, ease: "easeOut" }}
            className="flex justify-start py-1"
          >
            <div className="inline-flex max-w-[75%] items-end gap-1 rounded-2xl text-xs text-emerald-300 shadow-sm">
              <span className="truncate">{typingText}</span>
              <span className="flex items-end gap-0.5">
                {[0, 0.18, 0.36].map((delay, index) => (
                  <motion.span
                    key={`typing-dot-${index}`}
                    className="size-[3.5px] rounded-full bg-emerald-300/90"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay,
                    }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-3 z-10 rounded-full border border-gray-700 bg-gray-800 p-3 text-gray-300 shadow-lg transition-colors hover:bg-gray-700 hover:text-white md:bottom-4 md:right-4"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          title="Scroll to bottom"
        >
          <ChevronDown size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-xs leading-5 text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
