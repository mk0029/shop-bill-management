"use client";

import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { SwipeableMessage } from "./SwipeableMessage";
import { BillDetailTrigger } from "../bills/bill-detail-trigger";
import type { ChatMessage } from "@/lib/chat-api";

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
}: Props) {
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
    <div className="space-y-4">
      {groupedMessages.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`}>
          <div className="sticky top-0 flex justify-center z-30 mb-2">
            <div className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
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
                actor === "admin"
                  ? status === "paid"
                    ? "View"
                    : "Update"
                  : status === "paid"
                    ? "View"
                    : "Pay Now";

              return (
                <div
                  key={`bill-${b._id}-${idx}`}
                  className="flex justify-start w-full"
                >
                  <div
                    className={`max-w-[90%] md:max-w-[80%] border rounded-md p-3 ${billCls.container}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-sm font-semibold ${billCls.title}`}
                        >
                          Bill Created of ₹
                          {Number(b.totalAmount ?? 0).toLocaleString("en-IN")}
                        </div>
                        <div className={`text-xs ${billCls.textMuted}`}>
                          {new Date(item.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
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
                          <div className="mt-1 text-[9px] md:text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
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
                <SwipeableMessage
                  message={m}
                  isSelf={isSelf}
                  parentMessage={parent}
                  showSenderName={shouldShowSenderName}
                  senderName={senderName}
                  actor={actor}
                  uploadProgress={uploadProgress}
                  groupPosition={groupPosition}
                  onView={() => {}}
                  onSwipeLeft={() => onReply(m)}
                  onSwipeRight={() => {
                    if (isSelf) {
                      onEdit(m);
                    }
                  }}
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
    </div>
  );
}
