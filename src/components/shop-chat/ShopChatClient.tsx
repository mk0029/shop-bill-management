"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BatteryCharging, Cable, Fan, Lightbulb, Loader2, MessageCircle, Plug, Plus, Search, UserPlus, Wrench, X, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { Modal } from "@/components/ui/modal";
import ChatHeader from "@/components/shop-chat/source/ChatRoom/ChatHeader";
import MediaGalleryViewer from "@/components/shop-chat/source/ChatRoom/MediaGalleryViewer";
import MessageInput from "@/components/shop-chat/source/ChatRoom/MessageInput";
import MessagesList from "@/components/shop-chat/source/ChatRoom/MessagesList";
import ChatItem from "@/components/shop-chat/source/ChatSidebar/ChatItem";
import {
  clearShopChatRoom,
  deleteShopChatMessage,
  editShopChatMessage,
  forwardShopChatMessage,
  getOrCreateCustomerShopChatRoom,
  getMyShopChatRoom,
  listShopChatMessages,
  listShopChatRooms,
  sendShopChatMessage,
} from "@/lib/shop-chat/api";
import { useShopChatSocket } from "@/lib/shop-chat/socket";
import type { ShopChatMessage, ShopChatRoom } from "@/lib/shop-chat/types";
import type { Message } from "@/lib/types";
import { useDynamicViewportHeight } from "@/hooks/use-dynamic-viewport-height";
import { useNotificationStore } from "@/store/notification-store";
import {
  clearAppSystemNotifications,
  markNotificationHandled,
  setActiveChatId,
} from "@/lib/notifications/dedupe";
import { safeInitial, safeUserName } from "@/lib/display-text";

type Mode = "admin" | "customer";

type ChatCustomer = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar?: string;
  profileImage?: string;
  profileImageUrl?: string;
};

function supportRoleLabel(role?: string | null) {
  return role === "technician" ? "Technician" : "Admin";
}

function isSupportAdminRole(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

function buildTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeMessage(list: ShopChatMessage[], message: ShopChatMessage) {
  const id = message.messageId;
  const clientId = message.clientMessageId;
  const billEventId = billEventIdFromMessage(message);
  const exists = list.some(
    (item) =>
      item.messageId === id ||
      (clientId && item.clientMessageId === clientId) ||
      (billEventId && billEventIdFromMessage(item) === billEventId),
  );
  if (exists) {
    return list.map((item) =>
      item.messageId === id ||
      (clientId && item.clientMessageId === clientId) ||
      (billEventId && billEventIdFromMessage(item) === billEventId)
        ? { ...item, ...message }
        : item,
    );
  }
  return [...list, message].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatLastSeen(value?: string | null) {
  if (!value) return "Offline";
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return "Offline";
  const diff = Date.now() - then;
  if (diff < 60_000) return "Last seen just now";
  if (diff < 60 * 60_000) return `Last seen ${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 24 * 60 * 60_000) return `Last seen ${Math.max(1, Math.floor(diff / (60 * 60_000)))}h ago`;
  return `Last seen ${new Date(value).toLocaleDateString([], { day: "numeric", month: "short" })}`;
}

function roomSortTime(room: ShopChatRoom) {
  const value = room.lastMessage?.createdAt || room.updatedAt || room.createdAt;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRoomsByLatestMessage(rooms: ShopChatRoom[]) {
  return [...rooms].sort((a, b) => roomSortTime(b) - roomSortTime(a));
}

function customerStatusText(customerId: string, onlineUserIds?: Set<string>, lastSeenByUser?: Record<string, string>) {
  return onlineUserIds?.has(customerId) ? "Online" : formatLastSeen(lastSeenByUser?.[customerId]);
}

function firstDisplayName(name: string, fallback = "Support") {
  return safeUserName(name, fallback).trim().split(/\s+/)[0] || fallback;
}

function supportStatusText(supportMembers: ShopChatRoom["admins"] = [], onlineUserIds?: Set<string>, lastSeenByUser?: Record<string, string>) {
  const onlineMembers = supportMembers.filter((member) => onlineUserIds?.has(member.userId));
  if (onlineMembers.length) {
    return onlineMembers
      .map((member) => firstDisplayName(member.name, supportRoleLabel(member.role)))
      .join(",");
  }
  const latestSeen = supportMembers
    .map((member) => lastSeenByUser?.[member.userId])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  return latestSeen ? formatLastSeen(latestSeen) : "Support team will reply soon";
}

function inferMediaType(file: File): ShopChatMessage["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function validIsoDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function effectiveMessageTimestamp(message: ShopChatMessage) {
  const eventType = String(message.systemEventType || message.systemEventData?.eventType || "");
  if (eventType === "bill_created") {
    return (
      validIsoDate(message.systemEventData?.createdAt) ||
      validIsoDate(message.systemEventData?.billDate) ||
      validIsoDate(message.createdAt) ||
      message.createdAt
    );
  }
  return message.createdAt;
}

function billEventIdFromMessage(message: ShopChatMessage) {
  if (
    String(message.systemEventType || message.systemEventData?.eventType || "") !== "bill_created" &&
    !String(message.clientMessageId || "").startsWith("event:bill_created:")
  ) {
    return "";
  }
  const dataId = String(message.systemEventData?.billId || "").trim();
  if (dataId) return dataId;
  return String(message.clientMessageId || "").replace("event:bill_created:", "").trim();
}

function dedupeBillCreatedMessages(messages: ShopChatMessage[]) {
  const seenBillEvents = new Set<string>();
  return messages.filter((message) => {
    const billEventId = billEventIdFromMessage(message);
    if (!billEventId) return true;
    if (seenBillEvents.has(billEventId)) return false;
    seenBillEvents.add(billEventId);
    return true;
  });
}

function roleSafeSystemText(text: string, mode: ChatMode) {
  const adminSafe = text
    .replace(/\bYour bill is created\b/gi, "Bill created")
    .replace(/\bYour bill has been created\b/gi, "Bill created")
    .replace(/\bYour bill created\b/gi, "Bill created")
    .replace(/\bYour payment received\b/gi, "Payment received")
    .replace(/\bYour credit added\b/gi, "Credit recorded")
    .replace(/\bNew service task created\b/gi, "New work assigned")
    .replace(/\bService task completed\b/gi, "Task completed");

  if (mode !== "customer") return adminSafe;

  return adminSafe
    .replace(/\bNew work assigned\b/gi, "Shop assigned new work")
    .replace(/\bWork updated\b/gi, "Shop updated your work")
    .replace(/\bService task updated\b/gi, "Shop updated your work")
    .replace(/\bService task time updated\b/gi, "Shop updated your work time")
    .replace(/\bTask completed\b/gi, "Shop completed your task");
}

function sanityAssetRefToImageUrl(ref: string) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "";
  if (!projectId || !dataset || !ref.startsWith("image-")) return "";
  const parts = ref.replace(/^image-/, "").split("-");
  const format = parts.pop();
  const dimensions = parts.pop();
  const id = parts.join("-");
  if (!id || !dimensions || !format) return "";
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`;
}

function normalizeChatImage(input: unknown) {
  if (!input) return "";
  if (typeof input === "string") return sanityAssetRefToImageUrl(input) || input;
  if (typeof input !== "object") return "";
  const value = input as {
    url?: unknown;
    asset?: { url?: unknown; _ref?: unknown };
    _ref?: unknown;
  };
  if (typeof value.url === "string") return value.url;
  if (typeof value.asset?.url === "string") return value.asset.url;
  if (typeof value.asset?._ref === "string") return sanityAssetRefToImageUrl(value.asset._ref);
  if (typeof value._ref === "string") return sanityAssetRefToImageUrl(value._ref);
  return "";
}

function imageFromProfileLike(input: unknown) {
  const value = input as {
    avatar?: unknown;
    profileImage?: unknown;
    profileImageUrl?: unknown;
    image?: unknown;
    photoURL?: unknown;
    senderAvatar?: unknown;
    senderProfileImage?: unknown;
    senderProfileImageUrl?: unknown;
  } | null;
  const raw =
    value?.avatar ||
    value?.profileImageUrl ||
    value?.profileImage ||
    value?.image ||
    value?.photoURL ||
    value?.senderAvatar ||
    value?.senderProfileImageUrl ||
    value?.senderProfileImage ||
    "";
  return normalizeChatImage(raw);
}

const emptyStateIcons = [
  { Icon: Cable, left: "8%", top: "18%", delay: 0, size: "h-7 w-7" },
  { Icon: Plug, left: "20%", top: "74%", delay: 0.35, size: "h-7 w-7" },
  { Icon: Lightbulb, left: "42%", top: "12%", delay: 0.75, size: "h-8 w-8" },
  { Icon: Fan, left: "72%", top: "18%", delay: 0.2, size: "h-7 w-7" },
  { Icon: BatteryCharging, left: "84%", top: "70%", delay: 0.65, size: "h-7 w-7" },
  { Icon: Wrench, left: "60%", top: "82%", delay: 1, size: "h-6 w-6" },
  { Icon: Zap, left: "91%", top: "34%", delay: 0.45, size: "h-6 w-6" },
];

function ChatEmptyState({ mode }: { mode: Mode }) {
  const reducedMotion = useReducedMotion();
  const title = mode === "customer" ? "Opening your support room" : "Choose a customer chat";
  const subtitle =
    mode === "customer"
      ? "Your conversation space is getting ready."
      : "Select a customer from the sidebar to view messages, bills, and updates.";

  return (
    <section className="relative flex h-full min-h-[70vh] flex-1 items-center justify-center overflow-hidden border border-white/10 bg-[#070b15] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.20),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(249,115,22,0.18),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[-10%] top-[24%] h-px w-[120%] rotate-[-7deg] bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
      <div className="absolute left-[-8%] top-[68%] h-px w-[116%] rotate-[5deg] bg-gradient-to-r from-transparent via-orange-300/25 to-transparent" />

      {emptyStateIcons.map(({ Icon, left, top, delay, size }) => (
        <motion.div
          key={`${left}-${top}`}
          className="absolute grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-cyan-100/55 shadow-[0_0_40px_rgba(34,211,238,0.10)] backdrop-blur-sm"
          style={{ left, top }}
          initial={{ opacity: 0, y: 8, rotate: -4 }}
          animate={
            reducedMotion
              ? { opacity: 0.34 }
              : {
                  opacity: [0.2, 0.46, 0.26],
                  y: [-8, 10, -8],
                  rotate: [-5, 6, -5],
                }
          }
          transition={{
            duration: 7 + delay,
            delay,
            repeat: reducedMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <Icon className={size} />
        </motion.div>
      ))}

      <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07101f]/45 to-[#050914]/85" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-slate-950/58 p-5 text-center shadow-2xl shadow-black/35 backdrop-blur-2xl"
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg border border-cyan-300/20 bg-white/[0.055] text-cyan-200 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
          <MessageCircle className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Chat workspace</p>
        <h3 className="mt-2 text-xl font-semibold tracking-normal text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Live support ready
        </div>
      </motion.div>
    </section>
  );
}

function mapShopMessageToSourceMessage(message: ShopChatMessage): Message {
  return {
    id: message.messageId,
    tempId: message.clientMessageId || undefined,
    content: message.text,
    senderId: message.senderId,
    senderName: safeUserName(message.senderName, message.senderRole === "customer" ? "Customer" : "Support"),
    senderRole: message.senderRole,
    senderAvatar: imageFromProfileLike(message),
    receiverId: undefined,
    groupId: message.roomId,
    timestamp: effectiveMessageTimestamp(message),
    status: message.status,
    type: message.type === "file" ? "document" : message.type,
    replyTo: message.replyTo
      ? {
          messageId: message.replyTo.messageId,
          text: message.replyTo.text,
          senderId: message.replyTo.senderId,
          senderName: safeUserName(message.replyTo.senderName),
        }
      : null,
    editedAt: message.editedAt || undefined,
    edited: Boolean(message.editedAt),
    deletedAt: message.deletedAt || undefined,
    deletedForEveryone: Boolean(message.deletedAt),
    forwarded: Boolean(message.forwarded),
    forwardedFrom: message.forwardedFrom || null,
    messageKind: message.messageKind,
    systemEventType: message.systemEventType || undefined,
    systemEventData: message.systemEventData || undefined,
    reactions: message.reactions || [],
  };
}

function RoomSidebar({
  mode,
  rooms,
  activeRoomId,
  myUserId,
  onSelect,
  onAddClick,
  typingByRoom = {},
  onlineUserIds = new Set<string>(),
  lastSeenByUser = {},
}: {
  mode: Mode;
  rooms: ShopChatRoom[];
  activeRoomId?: string | null;
  myUserId?: string;
  onSelect: (room: ShopChatRoom) => void;
  onAddClick: () => void;
  typingByRoom?: Record<string, string>;
  onlineUserIds?: Set<string>;
  lastSeenByUser?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = sortRoomsByLatestMessage(rooms);
    if (!q) return sorted;
    return sorted.filter((room) => {
      const label = mode === "customer" ? "support chat support team" : `${room.customerName} ${room.customerKey || ""}`;
      return label.toLowerCase().includes(q);
    });
  }, [mode, query, rooms]);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && searchContainerRef.current?.contains(target)) return;
      setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-white/10 bg-slate-950/55 shadow-2xl shadow-black/30 backdrop-blur-2xl md:w-80">
      <div ref={searchContainerRef} className="border-b border-white/10 bg-white/[0.035] px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            {mode === "customer" ? "Chats" : "Customer Chats"}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                query.trim()
                  ? "border-blue-400/60 bg-blue-500/15 text-blue-100"
                  : "border-white/10 bg-white/[0.06] text-slate-200 hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-100"
              }`}
              title="Search chats"
              aria-label="Search chats"
            >
              <Search className="h-4 w-4" />
            </button>
            {mode === "admin" && (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  onAddClick();
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200 transition hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-100"
                title="Add customer to chat"
                aria-label="Add customer to chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {searchOpen && (
          <div
            ref={searchContainerRef}
            className="mt-3 rounded-lg border border-white/10 bg-slate-950/80 p-2 shadow-lg shadow-black/30 backdrop-blur-xl"
          >
            <div className="space-y-2">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-10 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-blue-400/70"
              />
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
                  aria-label="Clear chat search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="px-1 text-xs text-slate-400">
              {query.trim() ? `${filtered.length} chat${filtered.length === 1 ? "" : "s"} found` : "Search customer chats"}
            </div>
          </div>
          </div>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-white/10 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.map((room) => {
          const unread = myUserId ? room.unreadBy?.[myUserId] || 0 : 0;
          const presenceText =
            mode === "customer"
              ? supportStatusText(room.admins, onlineUserIds, lastSeenByUser)
              : customerStatusText(room.customerId, onlineUserIds, lastSeenByUser);
          const last = room.lastMessage
            ? {
                content:
                  room.lastMessage.type === "text"
                    ? roleSafeSystemText(room.lastMessage.text, mode)
                    : `[${room.lastMessage.type}]`,
                timestamp: room.lastMessage.createdAt,
                senderId: room.lastMessage.senderId,
                kind: room.lastMessage.type === "text" ? ("text" as const) : ("media" as const),
              }
            : undefined;
          return (
            <div
              key={room.roomId}
              className={
                room.roomId === activeRoomId
                  ? "bg-white/[0.055] shadow-[inset_2px_0_0_rgba(52,211,153,0.75)] backdrop-blur-xl"
                  : "bg-transparent"
              }
            >
              <ChatItem
                friend={{
                  _id: room.roomId,
                  name: mode === "customer" ? "Shop Support" : safeUserName(room.customerName, "Customer"),
                  avatar:
                    mode === "customer"
                      ? imageFromProfileLike(room.admins[0])
                      : imageFromProfileLike(room.participants.find((participant) => participant.userId === room.customerId)),
                  online:
                    mode === "customer"
                      ? room.admins.some((admin) => onlineUserIds.has(admin.userId))
                      : onlineUserIds.has(room.customerId),
                  lastSeen:
                    mode === "customer"
                      ? room.admins
                          .map((admin) => lastSeenByUser[admin.userId])
                          .filter(Boolean)
                          .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
                      : lastSeenByUser[room.customerId],
                  statusText: presenceText,
                  isGroup: true,
                  memberCount: room.participants.length,
                  rawGroupId: room.roomId,
                }}
                lastMessage={last}
                unreadCount={unread}
                isTyping={Boolean(typingByRoom[room.roomId])}
                isBlocked={false}
                isPinned={false}
                isStarred={false}
                isMuted={false}
                isArchived={false}
                currentUserId={myUserId || ""}
                onSelect={() => onSelect(room)}
                onPin={() => {}}
                onToggleStar={() => {}}
                onMute={() => {}}
                onArchive={() => {}}
                onMarkUnread={() => {}}
                onDeleteChat={() => {}}
                onApproveUnblock={() => {}}
                onDeclineUnblock={() => {}}
              />
              {!last && (
                <div className="-mt-5 mb-2 ml-[4.4rem] text-xs text-gray-500">
                  {presenceText}
                </div>
              )}
            </div>
          );
        })}
        {!filtered.length && <div className="p-6 text-center text-sm text-gray-500">No customer rooms yet.</div>}
      </ul>
    </aside>
  );
}

function ChatPanel({
  mode,
  room,
  messages,
  connected,
  typingText,
  statusLabel,
  peerOnline,
  peerLastSeen,
  customerDetails,
  canGoBack,
  onBack,
  onOpenBills,
  onSend,
  onSendFiles,
  onSendVoiceNote,
  onTyping,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onResendMessage,
  onClearChat,
}: {
  mode: Mode;
  room: ShopChatRoom | null;
  messages: ShopChatMessage[];
  connected: boolean;
  typingText: string;
  statusLabel: string;
  peerOnline: boolean;
  peerLastSeen?: string | null;
  customerDetails?: ChatCustomer | null;
  canGoBack?: boolean;
  onBack?: () => void;
  onOpenBills?: () => void;
  onSend: (text: string, options?: { replyTo?: ShopChatMessage["replyTo"]; type?: ShopChatMessage["type"]; attachments?: unknown[] }) => Promise<void>;
  onSendFiles: (files: File[], kind: "image" | "video" | "audio" | "document" | "contact") => Promise<void>;
  onSendVoiceNote: (audioBlob: Blob) => Promise<void>;
  onTyping: (typing: boolean) => void;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (message: Message) => Promise<void>;
  onForwardMessage?: (message: Message) => void;
  onResendMessage: (message: Message) => Promise<void>;
  onClearChat?: () => void;
}) {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryActiveId, setGalleryActiveId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const sourceMessages = useMemo(
    () =>
      messages
        .map(mapShopMessageToSourceMessage)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [messages],
  );
  const headerName = mode === "customer" ? "Chat Support" : safeUserName(room?.customerName, "Customer");
  const detailItems = useMemo(() => {
    if (!room) return [];
    if (mode === "customer") {
      const adminDetails = (room.admins || []).map((admin, index) => ({
        label: safeUserName(admin.name, `${supportRoleLabel(admin.role)} ${index + 1}`),
        value: supportRoleLabel(admin.role),
        tone: admin.role === "technician" ? "technician" as const : "admin" as const,
        fields: [
          { label: "Role", value: supportRoleLabel(admin.role) },
          { label: "Email", value: admin.email || "Not available", href: admin.email ? `mailto:${admin.email}` : undefined },
          { label: "Phone", value: admin.phone || "Not available", href: admin.phone ? `tel:${admin.phone}` : undefined },
        ],
      }));
      return adminDetails.length ? adminDetails : [{ label: "Support", value: "Admins and technicians are available in this room" }];
    }
    return [
      { label: "Customer ID", value: room.customerKey || room.customerId },
      { label: "Email", value: customerDetails?.email, href: customerDetails?.email ? `mailto:${customerDetails.email}` : undefined },
      { label: "Phone", value: customerDetails?.phone, href: customerDetails?.phone ? `tel:${customerDetails.phone}` : undefined },
      { label: "Location", value: customerDetails?.location },
      { label: "Participants", value: `${room.participants.length} member(s)` },
    ];
  }, [customerDetails?.email, customerDetails?.location, customerDetails?.phone, mode, room]);

  const galleryItems = useMemo(
    () =>
      sourceMessages
        .filter((message) => message.type === "image" && !message.deletedForEveryone)
        .map((message) => ({
          id: message.id,
          src: message.content,
          senderName: safeUserName(message.senderName, message.senderId === room?.customerId ? "Customer" : "Support"),
          timestamp: message.timestamp,
        })),
    [room?.customerId, room?.customerName, sourceMessages],
  );

  const submitMessage = async (text: string) => {
    if (editingMessage) {
      await onEditMessage(editingMessage.id, text);
      setEditingMessage(null);
      return;
    }
    await onSend(text, {
      replyTo: replyTo
        ? {
            messageId: replyTo.id,
            text: replyTo.content,
            senderId: replyTo.senderId,
            senderName: safeUserName(replyTo.senderName, replyTo.senderId === room?.customerId ? "Customer" : "Support"),
          }
        : null,
    });
    setReplyTo(null);
  };

  if (!room) {
    return <ChatEmptyState mode={mode} />;
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <ChatHeader
        peer={{
          id: room.customerId,
          name: headerName,
          avatar: mode === "admin"
            ? imageFromProfileLike(customerDetails || room.participants.find((participant) => participant.userId === room.customerId))
            : imageFromProfileLike(room.admins[0]),
          online: peerOnline,
          lastSeen: peerLastSeen || undefined,
        }}
        typingLabel={typingText}
        statusLabel={statusLabel}
        connected={connected}
        onBack={canGoBack ? onBack : undefined}
        onSearch={() => setSearchOpen(true)}
        onOpenMedia={() => setGalleryOpen(true)}
        onOpenBills={onOpenBills}
        onClearChat={mode === "admin" ? onClearChat : undefined}
        profileDetails={detailItems}
        isGroup
        groupInfo={{
          memberCount: room.participants.length,
          activeMemberCount: room.participants.filter((participant) => participant.role === "customer" ? peerOnline : true).length,
          members: room.participants.map((participant) => ({
            userId: participant.userId,
            userName: safeUserName(participant.name, "Member"),
            role: participant.role,
            status: participant.role === "customer" ? (peerOnline ? "online" : formatLastSeen(peerLastSeen)) : "support",
          })),
        }}
      />
      <MessagesList
        messages={sourceMessages}
        initialLoading={false}
        isLoading={false}
        typingText={typingText}
        onMessageReply={setReplyTo}
        onMessageEdit={setEditingMessage}
        onMessageDelete={onDeleteMessage}
        onMessageForward={onForwardMessage}
        onMessageResend={onResendMessage}
        onOpenImage={(payload) => {
          setGalleryActiveId(payload.messageId);
          setGalleryOpen(true);
        }}
      />
      <div className="border-t border-white/10 bg-slate-950/45 backdrop-blur-2xl">
        <MessageInput
          onSendMessage={submitMessage}
          onTyping={(state) => onTyping(state.active)}
          onSendFiles={onSendFiles}
          onSendVoiceNote={onSendVoiceNote}
          replyTo={
            replyTo
              ? {
                  messageId: replyTo.id,
                  text: replyTo.content,
                  senderName: safeUserName(replyTo.senderName, replyTo.senderId === room.customerId ? "Customer" : "Support"),
                }
              : undefined
          }
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage ? { id: editingMessage.id, content: editingMessage.content } : null}
          onCancelEdit={() => setEditingMessage(null)}
          placeholder="Type a message..."
          focusKey={room.roomId}
        />
      </div>
      <MediaGalleryViewer
        open={galleryOpen}
        items={galleryItems}
        activeId={galleryActiveId}
        onClose={() => setGalleryOpen(false)}
      />
      {searchOpen && (
        <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search messages"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-800">
              {sourceMessages
                .filter((message) => !searchQuery || message.content.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      document.getElementById(`msg-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setSearchOpen(false);
                    }}
                    className="block w-full px-2 py-2 text-left text-sm hover:bg-slate-800"
                  >
                    <div className="text-xs text-slate-500">{new Date(message.timestamp).toLocaleString()}</div>
                    <div className="truncate">{roleSafeSystemText(message.content || "Media message", mode)}</div>
                  </button>
                ))}
              {searchQuery && !sourceMessages.some((message) => message.content.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="px-2 py-4 text-center text-sm text-slate-400">No matches</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-700/35 ${className}`} />;
}

function ChatLoadingSkeleton({ mode }: { mode: Mode }) {
  return (
    <div
      className="min-h-0 overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#08111f_34%,#061b17_66%,#160a18_100%)]"
      style={{ height: "var(--app-vh, 100dvh)" }}
    >
      <div className="flex h-full min-h-0">
        {mode === "admin" && (
          <aside className="hidden h-full w-80 shrink-0 flex-col border-r border-white/10 bg-slate-950/55 backdrop-blur-2xl md:flex">
            <div className="border-b border-white/10 bg-white/[0.035] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-5 w-5 rounded-full bg-blue-500/25" />
                  <SkeletonBlock className="h-5 w-36" />
                </div>
                <SkeletonBlock className="h-9 w-9 rounded-xl bg-blue-500/20" />
              </div>
              <SkeletonBlock className="h-11 w-full rounded-xl" />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl px-2 py-3">
                  <SkeletonBlock className="h-11 w-11 rounded-full bg-emerald-500/20" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="h-3 w-9" />
                    </div>
                    <SkeletonBlock className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white/[0.018] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-slate-950/45 px-3 py-3 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
              <SkeletonBlock className="h-11 w-11 rounded-full bg-emerald-500/20" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-3 w-24 bg-emerald-500/20" />
              </div>
              <SkeletonBlock className="h-7 w-7 rounded-full" />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-hidden bg-slate-950/20 p-4">
            <div className="flex items-end gap-2">
              <SkeletonBlock className="h-8 w-8 rounded-full bg-emerald-500/20" />
              <SkeletonBlock className="h-14 w-44 rounded-2xl rounded-bl-sm" />
            </div>
            <div className="flex justify-end">
              <SkeletonBlock className="h-12 w-36 rounded-2xl rounded-br-sm bg-slate-500/35" />
            </div>
            <div className="flex items-end gap-2">
              <SkeletonBlock className="h-8 w-8 rounded-full bg-emerald-500/20" />
              <SkeletonBlock className="h-20 w-56 rounded-2xl rounded-bl-sm" />
            </div>
            <div className="flex justify-end">
              <SkeletonBlock className="h-16 w-48 rounded-2xl rounded-br-sm bg-slate-500/35" />
            </div>
            <div className="flex items-end gap-2">
              <SkeletonBlock className="h-8 w-8 rounded-full bg-emerald-500/20" />
              <SkeletonBlock className="h-12 w-40 rounded-2xl rounded-bl-sm" />
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/45 p-3 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 flex-1 rounded-full" />
              <SkeletonBlock className="h-11 w-11 rounded-full bg-emerald-500/25" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ShopChatClient({
  mode,
  initialCustomers = [],
}: {
  mode: Mode;
  initialCustomers?: ChatCustomer[];
}) {
  useDynamicViewportHeight();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const myUserId = String((user as any)?.id || (user as any)?._id || "");
  const myRole = String((user as any)?.role || "");
  const canClearActiveChat = mode === "admin" && isSupportAdminRole(myRole);
  const [rooms, setRooms] = useState<ShopChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ShopChatRoom | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ShopChatMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [typingByRoom, setTypingByRoom] = useState<Record<string, string>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState<Record<string, string>>({});
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardingRoomId, setForwardingRoomId] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [billFilter, setBillFilter] = useState<"all" | "pending" | "paid">("all");
  const [chatBills, setChatBills] = useState<Array<Record<string, any>>>([]);
  const [chatBillsLoading, setChatBillsLoading] = useState(false);
  const deliveredRef = useRef<Set<string>>(new Set());
  const readAtRef = useRef<Record<string, number>>({});
  const activeRoomRef = useRef<ShopChatRoom | null>(null);
  const messagesByRoomRef = useRef<Record<string, ShopChatMessage[]>>({});
  const refreshAtRef = useRef<Record<string, number>>({});
  const autoOpenCustomerRef = useRef("");
  const handledReloadParamRef = useRef(false);
  const syncedBillEventsRef = useRef<Set<string>>(new Set());
  const { socket, connected, sendMessage: sendSocketMessage } = useShopChatSocket(activeRoom?.roomId);
  const chatParam = searchParams.get("chat") || "";

  const activeMessages = activeRoom
    ? dedupeBillCreatedMessages(messagesByRoom[activeRoom.roomId] || [])
    : [];
  const activeCustomer = useMemo(
    () => initialCustomers.find((customer) => customer._id === activeRoom?.customerId) || null,
    [activeRoom?.customerId, initialCustomers],
  );
  const selectedCustomer = useMemo(
    () => initialCustomers.find((customer) => customer._id === selectedCustomerId) || null,
    [initialCustomers, selectedCustomerId],
  );

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    messagesByRoomRef.current = messagesByRoom;
  }, [messagesByRoom]);

  const pushChatParam = useCallback(
    (roomId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("chat") === roomId) return;
      params.set("chat", roomId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearChatParam = useCallback(() => {
    setActiveRoom(null);
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("chat")) {
      return;
    }
    params.delete("chat");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (handledReloadParamRef.current) return;
    handledReloadParamRef.current = true;
    if (mode !== "admin" || !chatParam || typeof window === "undefined") return;
    const nav = window.performance?.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== "reload") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("chat");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [chatParam, mode, pathname, router]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("shop-chat:room-state", {
        detail: { mode, roomOpen: Boolean(activeRoom) },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("shop-chat:room-state", {
          detail: { mode, roomOpen: false },
        }),
      );
    };
  }, [activeRoom, mode]);

  const upsertRoom = useCallback((room: ShopChatRoom) => {
    setRooms((prev) => {
      const exists = prev.some((item) => item.roomId === room.roomId);
      const next = exists ? prev.map((item) => (item.roomId === room.roomId ? room : item)) : [room, ...prev];
      return sortRoomsByLatestMessage(next);
    });
    setActiveRoom((prev) => (prev?.roomId === room.roomId ? room : prev));
  }, []);

  const loadMessages = useCallback(async (room: ShopChatRoom) => {
    const response = await listShopChatMessages(room.roomId, { limit: 80 });
    setMessagesByRoom((prev) => ({
      ...prev,
      [room.roomId]: dedupeBillCreatedMessages(response.messages),
    }));
  }, []);

  const refreshRoomMessages = useCallback(
    (room: ShopChatRoom | null, throttleMs = 1000) => {
      if (!room) return;
      const now = Date.now();
      if (now - (refreshAtRef.current[room.roomId] || 0) < throttleMs) return;
      refreshAtRef.current[room.roomId] = now;
      void loadMessages(room).catch((error) => {
        console.warn("[ShopChat] failed to refresh messages", error);
      });
    },
    [loadMessages],
  );

  const refreshRoomIfMissingLastMessage = useCallback(
    (room: ShopChatRoom) => {
      const lastMessageId = room.lastMessage?.messageId;
      if (!lastMessageId) return;
      const messages = messagesByRoomRef.current[room.roomId] || [];
      const hasLastMessage = messages.some((message) => message.messageId === lastMessageId);
      if (!hasLastMessage) refreshRoomMessages(room);
    },
    [refreshRoomMessages],
  );

  const syncBillEventsForRoom = useCallback(async (room: ShopChatRoom) => {
    if (mode !== "admin" || syncedBillEventsRef.current.has(room.roomId)) return;
    syncedBillEventsRef.current.add(room.roomId);
    try {
      const response = await fetch(`/api/bill-book/user/${encodeURIComponent(room.customerId)}/list`);
      const body = await response.json().catch(() => ({}));
      const bills = Array.isArray(body?.data) ? body.data : [];
      const billDateById = new Map<string, string>();
      for (const bill of bills) {
        const displayDate = validIsoDate(bill.billDate || bill.serviceDate || bill.createdAt);
        if (!displayDate) continue;
        [bill._id, bill.id, bill.billId, bill.billNumber]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .forEach((key) => billDateById.set(key, displayDate));
      }
      if (billDateById.size) {
        setMessagesByRoom((prev) => ({
          ...prev,
          [room.roomId]: (prev[room.roomId] || []).map((message) => {
            const billId = billEventIdFromMessage(message);
            const displayDate = billId ? billDateById.get(billId) : "";
            if (!displayDate) return message;
            return {
              ...message,
              systemEventData: {
                ...(message.systemEventData || {}),
                eventType: "bill_created",
                billId,
                createdAt: displayDate,
              },
            };
          }),
        }));
      }
    } catch {}
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      setError("");
      try {
        if (mode === "admin") {
          const response = await listShopChatRooms();
          if (cancelled) return;
          setRooms(sortRoomsByLatestMessage(response.rooms));
          setActiveRoom(null);
        } else {
          const response = await getMyShopChatRoom();
          if (cancelled) return;
          setRooms(sortRoomsByLatestMessage([response.room]));
          setActiveRoom(response.room);
          await loadMessages(response.room);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [loadMessages, mode, syncBillEventsForRoom]);

  useEffect(() => {
    if (mode === "customer") return;
    if (loading) return;
    if (!chatParam) {
      if (activeRoom) setActiveRoom(null);
      return;
    }
    if (activeRoom?.roomId === chatParam) return;
    const room = rooms.find((item) => item.roomId === chatParam);
    if (!room) return;
    void selectRoom(room, false);
  }, [activeRoom, chatParam, loading, mode, rooms]);

  useEffect(() => {
    const customerId = searchParams.get("customerId") || "";
    if (mode !== "admin" || loading || !customerId || autoOpenCustomerRef.current === customerId) return;
    autoOpenCustomerRef.current = customerId;
    void (async () => {
      try {
        const existing = rooms.find((room) => room.customerId === customerId || room.customerKey === customerId);
        if (existing) {
          await selectRoom(existing);
          return;
        }
        const response = await getOrCreateCustomerShopChatRoom(customerId);
        upsertRoom(response.room);
        await selectRoom(response.room);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to open customer chat");
      }
    })();
  }, [loading, mode, rooms, searchParams, upsertRoom]);

  useEffect(() => {
    if (!socket) return;
    const onRoomUpdated = (room: ShopChatRoom) => {
      upsertRoom(room);
      if (activeRoomRef.current?.roomId === room.roomId) {
        refreshRoomIfMissingLastMessage(room);
      }
    };
    const onRoomJoined = ({ room }: { room: ShopChatRoom }) => {
      upsertRoom(room);
      if (activeRoomRef.current?.roomId === room.roomId) {
        refreshRoomIfMissingLastMessage(room);
      }
    };
    const onMessageNew = (message: ShopChatMessage) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [message.roomId]: mergeMessage(prev[message.roomId] || [], message),
      }));
      if (message.senderId !== myUserId && !deliveredRef.current.has(message.messageId)) {
        deliveredRef.current.add(message.messageId);
        socket.emit("message:delivered", { messageIds: [message.messageId] });
      }
    };
    const onMessageCleared = ({ roomId, message }: { roomId: string; message: ShopChatMessage }) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: [message],
      }));
    };
    const onStatus = ({ messages }: { messages: ShopChatMessage[] }) => {
      setMessagesByRoom((prev) => {
        const next = { ...prev };
        for (const message of messages) {
          next[message.roomId] = mergeMessage(next[message.roomId] || [], message);
        }
        return next;
      });
    };
    const onTyping = (payload: { roomId: string; userId: string; name: string; typing: boolean }) => {
      if (payload.userId === myUserId) return;
      setTypingByRoom((prev) => ({ ...prev, [payload.roomId]: payload.typing ? `${payload.name} is typing...` : "" }));
    };
    const onPresence = (payload: {
      users: Array<{ userId: string; lastSeen?: string }>;
      lastSeen?: Array<{ userId: string; lastSeen?: string }>;
    }) => {
      const onlineIds = new Set((payload.users || []).map((item) => String(item.userId)));
      setOnlineUserIds(onlineIds);
      setLastSeenByUser((prev) => {
        const next = { ...prev };
        for (const item of payload.users || []) {
          if (item.lastSeen) next[String(item.userId)] = item.lastSeen;
        }
        for (const item of payload.lastSeen || []) {
          if (item.lastSeen) next[String(item.userId)] = item.lastSeen;
        }
        for (const userId of Object.keys(prev)) {
          if (!onlineIds.has(userId) && !next[userId]) next[userId] = new Date().toISOString();
        }
        return next;
      });
    };
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:joined", onRoomJoined);
    socket.on("message:new", onMessageNew);
    socket.on("message:cleared", onMessageCleared);
    socket.on("message:status", onStatus);
    socket.on("typing:update", onTyping);
    socket.on("presence:snapshot", onPresence);
    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:joined", onRoomJoined);
      socket.off("message:new", onMessageNew);
      socket.off("message:cleared", onMessageCleared);
      socket.off("message:status", onStatus);
      socket.off("typing:update", onTyping);
      socket.off("presence:snapshot", onPresence);
    };
  }, [myUserId, refreshRoomIfMissingLastMessage, socket, upsertRoom]);

  useEffect(() => {
    if (!connected) return;
    refreshRoomMessages(activeRoomRef.current);
  }, [connected, refreshRoomMessages]);

  useEffect(() => {
    const refreshVisibleRoom = () => {
      if (document.visibilityState === "hidden") return;
      refreshRoomMessages(activeRoomRef.current);
    };
    document.addEventListener("visibilitychange", refreshVisibleRoom);
    window.addEventListener("focus", refreshVisibleRoom);
    window.addEventListener("pageshow", refreshVisibleRoom);
    return () => {
      document.removeEventListener("visibilitychange", refreshVisibleRoom);
      window.removeEventListener("focus", refreshVisibleRoom);
      window.removeEventListener("pageshow", refreshVisibleRoom);
    };
  }, [refreshRoomMessages]);

  useEffect(() => {
    setActiveChatId(activeRoom?.roomId || null);
    if (activeRoom?.roomId) clearAppSystemNotifications({ roomId: activeRoom.roomId });
    return () => setActiveChatId(null);
  }, [activeRoom?.roomId]);

  useEffect(() => {
    if (!activeRoom || !socket) return;
    const unread = activeMessages.filter((message) => message.senderId !== myUserId && !message.readBy.some((receipt) => receipt.userId === myUserId));
    if (!unread.length) return;
    const now = Date.now();
    if (now - (readAtRef.current[activeRoom.roomId] || 0) < 1200) return;
    readAtRef.current[activeRoom.roomId] = now;
    useNotificationStore.getState().removeWhere((notification) => {
      const meta = notification.meta;
      return meta?.type === "shop_chat" && meta?.roomId === activeRoom.roomId;
    });
    unread.forEach((message) => markNotificationHandled(message.messageId));
    clearAppSystemNotifications({ roomId: activeRoom.roomId });
    socket.emit("message:read", { roomId: activeRoom.roomId, messageIds: unread.map((message) => message.messageId) });
  }, [activeMessages, activeRoom, myUserId, socket]);

  const selectRoom = async (room: ShopChatRoom, syncUrl = true) => {
    if (syncUrl && mode === "admin") pushChatParam(room.roomId);
    setActiveRoom(room);
    await loadMessages(room);
    void syncBillEventsForRoom(room);
  };

  const addCustomerRoom = async () => {
    if (!selectedCustomerId || addingCustomer) return;
    setAddingCustomer(true);
    setError("");
    try {
      const response = await getOrCreateCustomerShopChatRoom(selectedCustomerId);
      upsertRoom(response.room);
      setAddOpen(false);
      setSelectedCustomerId("");
      await selectRoom(response.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add customer chat");
    } finally {
      setAddingCustomer(false);
    }
  };

  const sendText = async (
    text: string,
    options?: {
      replyTo?: ShopChatMessage["replyTo"];
      type?: ShopChatMessage["type"];
      attachments?: unknown[];
    },
  ) => {
    if (!activeRoom || !myUserId) return;
    const tempId = buildTempId();
    const type = options?.type || "text";
    const optimistic: ShopChatMessage = {
      messageId: tempId,
      clientMessageId: tempId,
      roomId: activeRoom.roomId,
      type,
      text,
      attachments: options?.attachments || [],
      senderId: myUserId,
      senderRole: mode === "admin" ? (myRole === "technician" ? "technician" : "admin") : "customer",
      senderName: safeUserName((user as any)?.name, mode === "admin" ? "Admin" : "Customer"),
      status: "sending",
      deliveredTo: [],
      readBy: [],
      replyTo: options?.replyTo || null,
      forwarded: false,
      forwardedFrom: null,
      reactions: [],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessagesByRoom((prev) => ({ ...prev, [activeRoom.roomId]: mergeMessage(prev[activeRoom.roomId] || [], optimistic) }));
    try {
      const response = socket?.connected
        ? await sendSocketMessage({
            roomId: activeRoom.roomId,
            text,
            type,
            attachments: options?.attachments || [],
            replyTo: options?.replyTo || null,
            clientMessageId: tempId,
          })
        : await sendShopChatMessage({
            roomId: activeRoom.roomId,
            text,
            type,
            attachments: options?.attachments || [],
            replyTo: options?.replyTo || null,
            clientMessageId: tempId,
      });
      setMessagesByRoom((prev) => ({ ...prev, [activeRoom.roomId]: mergeMessage(prev[activeRoom.roomId] || [], response.message) }));
      if (response.room) upsertRoom(response.room);
    } catch {
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoom.roomId]: (prev[activeRoom.roomId] || []).map((message) =>
          message.clientMessageId === tempId ? { ...message, status: "failed" } : message,
        ),
      }));
    }
  };

  const editMessage = async (messageId: string, text: string) => {
    if (!activeRoom) return;
    const response = await editShopChatMessage(messageId, text);
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.roomId]: mergeMessage(prev[activeRoom.roomId] || [], response.message),
    }));
    if (response.room) upsertRoom(response.room);
  };

  const deleteMessage = async (message: Message) => {
    if (!activeRoom) return;
    const scope = message.senderId === myUserId ? "everyone" : "me";
    const label = scope === "everyone" ? "delete this message for everyone" : "delete this message for you";
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    const response = await deleteShopChatMessage(message.id, scope);
    if (response.localOnly) {
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoom.roomId]: (prev[activeRoom.roomId] || []).filter((item) => item.messageId !== message.id),
      }));
      return;
    }
    if (response.message) {
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoom.roomId]: mergeMessage(prev[activeRoom.roomId] || [], response.message!),
      }));
    }
    if (response.room) upsertRoom(response.room);
  };

  const resendMessage = async (message: Message) => {
    await sendText(message.content, { type: (message.type as ShopChatMessage["type"]) || "text" });
  };

  const sendFiles = async (files: File[], kind: "image" | "video" | "audio" | "document" | "contact") => {
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      const type: ShopChatMessage["type"] = kind === "document" || kind === "contact" ? "file" : inferMediaType(file);
      await sendText(dataUrl, {
        type,
        attachments: [{ name: file.name, type: file.type, size: file.size }],
      });
    }
  };

  const sendVoiceNote = async (audioBlob: Blob) => {
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
    await sendFiles([file], "audio");
  };

  const forwardSelectedMessage = async () => {
    if (!forwardMessage || !forwardingRoomId || forwarding) return;
    setForwarding(true);
    try {
      const response = await forwardShopChatMessage(forwardMessage.id, forwardingRoomId);
      setMessagesByRoom((prev) => ({
        ...prev,
        [response.message.roomId]: mergeMessage(prev[response.message.roomId] || [], response.message),
      }));
      upsertRoom(response.room);
      setForwardMessage(null);
      setForwardingRoomId("");
    } finally {
      setForwarding(false);
    }
  };

  const clearActiveChat = async () => {
    if (!activeRoom) return;
    if (!window.confirm("Clear this chat for both admin and customer?")) return;
    const roomId = activeRoom.roomId;
    const response = await clearShopChatRoom(roomId);
    setMessagesByRoom((prev) => ({ ...prev, [roomId]: [response.message] }));
    upsertRoom(response.room);
  };

  const sendTyping = (typing: boolean) => {
    if (!socket || !activeRoom) return;
    socket.emit("typing:update", { roomId: activeRoom.roomId, typing });
  };

  const openBillsPanel = async () => {
    if (!activeRoom?.customerId) return;
    setBillsOpen(true);
    setChatBillsLoading(true);
    try {
      const response = await fetch(`/api/bill-book/user/${encodeURIComponent(activeRoom.customerId)}/list`);
      const body = await response.json().catch(() => ({}));
      setChatBills(Array.isArray(body?.data) ? body.data : []);
    } catch {
      setChatBills([]);
    } finally {
      setChatBillsLoading(false);
    }
  };

  const openBillRoute = (bill: Record<string, any>) => {
    const billId = encodeURIComponent(String(bill?._id || bill?.id || bill?.billId || ""));
    if (!billId) return;
    setBillsOpen(false);
    if (mode === "customer") {
      router.push(`/customer/bills?open=${billId}`);
      return;
    }
    router.push(`/admin/customers/${encodeURIComponent(String(activeRoom?.customerId || ""))}/bills?open=${billId}`);
  };

  const visibleChatBills = chatBills.filter((bill) => {
    if (billFilter === "all") return true;
    const status = String(bill.paymentStatus || bill.status || "pending").toLowerCase();
    return billFilter === "paid" ? status === "paid" : status !== "paid";
  });

  if (loading) {
    return <ChatLoadingSkeleton mode={mode} />;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-200">{error}</div>;
  }

  return (
    <div
      className="min-h-0 overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#08111f_34%,#061b17_66%,#160a18_100%)]"
      style={{ height: "var(--app-vh, 100dvh)" }}
    >
      <div className="relative flex h-full min-h-0 overflow-hidden">
        {mode === "admin" && (
          <div
            className={`absolute inset-y-0 left-0 z-20 h-full w-full shrink-0 transition-transform duration-300 ease-out md:static md:w-80 md:translate-x-0 ${
              activeRoom ? "-translate-x-full pointer-events-none md:pointer-events-auto" : "translate-x-0"
            }`}
          >
            <RoomSidebar
              mode={mode}
              rooms={rooms}
              activeRoomId={activeRoom?.roomId}
              myUserId={myUserId}
              onSelect={selectRoom}
              onAddClick={() => setAddOpen(true)}
              typingByRoom={typingByRoom}
              onlineUserIds={onlineUserIds}
              lastSeenByUser={lastSeenByUser}
            />
          </div>
        )}
        <div
          className={`absolute inset-0 z-10 flex min-w-0 flex-1 transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0 ${
            !activeRoom
              ? "translate-x-full pointer-events-none md:pointer-events-auto"
              : "translate-x-0 pointer-events-auto"
          }`}
        >
          <ChatPanel
            mode={mode}
            room={activeRoom}
            messages={activeMessages}
            connected={connected}
            typingText={activeRoom ? typingByRoom[activeRoom.roomId] || "" : ""}
            statusLabel={
              activeRoom
                ? mode === "admin"
                    ? customerStatusText(activeRoom.customerId, onlineUserIds, lastSeenByUser)
                    : supportStatusText(activeRoom.admins, onlineUserIds, lastSeenByUser)
                : ""
            }
            peerOnline={
              activeRoom
                ? mode === "admin"
                  ? onlineUserIds?.has(activeRoom.customerId)
                  : activeRoom.admins.some((admin) => onlineUserIds?.has(admin.userId))
                : false
            }
            peerLastSeen={
              activeRoom
                ? mode === "admin"
                  ? lastSeenByUser[activeRoom.customerId]
                  : activeRoom.admins
                      .map((admin) => lastSeenByUser[admin.userId])
                      .filter(Boolean)
                      .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
                : undefined
            }
            customerDetails={activeCustomer}
            canGoBack={mode === "admin"}
            onOpenBills={openBillsPanel}
            onBack={clearChatParam}
            onSend={sendText}
            onSendFiles={sendFiles}
            onSendVoiceNote={sendVoiceNote}
            onTyping={sendTyping}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onForwardMessage={
              mode === "admin"
                ? (message) => {
                    setForwardMessage(message);
                    setForwardingRoomId(activeRoom?.roomId || "");
                  }
                : undefined
            }
            onResendMessage={resendMessage}
            onClearChat={canClearActiveChat ? clearActiveChat : undefined}
          />
        </div>
      </div>
      {mode === "admin" && (
        <Modal
          isOpen={addOpen}
          onClose={() => {
            if (!addingCustomer) {
              setAddOpen(false);
              setSelectedCustomerId("");
            }
          }}
          title="Add Customer Chat"
          size="md"
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">
              Pick an existing customer. The system will create one room per customer, or open the existing room if it already exists.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Customer</label>
              <CustomerAutocomplete
                customers={initialCustomers}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                placeholder="Search by customer name, phone, or location"
              />
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {imageFromProfileLike(selectedCustomer) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageFromProfileLike(selectedCustomer)} alt={safeUserName(selectedCustomer.name, "Customer")} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    safeInitial(selectedCustomer.name)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{safeUserName(selectedCustomer.name, "Customer")}</p>
                  <p className="truncate text-xs text-gray-400">
                    {[selectedCustomer.phone, selectedCustomer.location].filter(Boolean).join(" • ") || "Existing customer"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  setSelectedCustomerId("");
                }}
                disabled={addingCustomer}
              >
                Cancel
              </Button>
              <Button type="button" onClick={addCustomerRoom} disabled={!selectedCustomerId || addingCustomer}>
                {addingCustomer ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add to Chat
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <Modal
        isOpen={Boolean(forwardMessage)}
        onClose={() => {
          if (!forwarding) {
            setForwardMessage(null);
            setForwardingRoomId("");
          }
        }}
        title="Forward Message"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Message</div>
            <div className="line-clamp-3 break-words">{forwardMessage?.content || "Media message"}</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Forward to room</label>
            <select
              value={forwardingRoomId}
              onChange={(event) => setForwardingRoomId(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {safeUserName(room.customerName, "Customer")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForwardMessage(null);
                setForwardingRoomId("");
              }}
              disabled={forwarding}
            >
              Cancel
            </Button>
            <Button type="button" onClick={forwardSelectedMessage} disabled={!forwardingRoomId || forwarding}>
              {forwarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forwarding...
                </>
              ) : (
                "Forward"
              )}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={billsOpen}
        onClose={() => setBillsOpen(false)}
        title={mode === "customer" ? "Your Bills" : `${safeUserName(activeRoom?.customerName, "Customer")} Bills`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "paid"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setBillFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                  billFilter === filter
                    ? "border-blue-400 bg-blue-500/20 text-blue-100"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="max-h-[58dvh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            {chatBillsLoading ? (
              <div className="p-6 text-center text-sm text-slate-400">Loading bills...</div>
            ) : visibleChatBills.length ? (
              <div className="divide-y divide-slate-800">
                {visibleChatBills.map((bill) => {
                  const status = String(bill.paymentStatus || bill.status || "pending").toLowerCase();
                  const amount = Number(bill.balanceAmount ?? bill.totalAmount ?? 0);
                  return (
                    <button
                      key={String(bill._id || bill.billId)}
                      type="button"
                      onClick={() => openBillRoute(bill)}
                      className="block w-full px-4 py-3 text-left transition hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white">{bill.billNumber || bill.billId || "Bill"}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {[bill.serviceType, bill.locationType].filter(Boolean).join(" • ") || "Service bill"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-slate-100">₹{amount.toLocaleString()}</div>
                          <div className={`mt-1 rounded-full px-2 py-0.5 text-[10px] uppercase ${
                            status === "paid" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
                          }`}>
                            {status}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">No bills found for this filter.</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
