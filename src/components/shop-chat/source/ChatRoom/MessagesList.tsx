import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import MessageBubble from "../MessageBubble";
import MediaCollageBubble from "../MessageBubble/MediaCollageBubble";
import { Message } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

interface MessagesListProps {
  messages: Message[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  initialLoading?: boolean;
  onMessageEdit?: (message: Message) => void;
  onMessageDelete?: (message: Message) => void;
  onMessageForward?: (message: Message) => void;
  onMessageReply?: (message: Message) => void;
  onMessageResend?: (message: Message) => void;
  onMessageSelect?: (message: Message) => void;
  selectedMessages?: Set<string>;
  selectMode?: boolean;
  unreadCount?: number;
  firstUnreadId?: string | null;
  typingText?: string;
  onScrollToBottom?: () => void;
  onViewportChange?: (state: { atBottom: boolean }) => void;
  onOpenImage?: (payload: { src: string; messageId: string }) => void;
}

interface MessageItem {
  kind: "single" | "collage";
  key: string;
  messages: Message[];
  prev: Message | null;
  next: Message | null;
}

function roleSafeSystemText(text: string, viewerRole: string) {
  const adminSafe = text
    .replace(/\bYour bill is created\b/gi, "Bill created")
    .replace(/\bYour bill has been created\b/gi, "Bill created")
    .replace(/\bYour bill created\b/gi, "Bill created")
    .replace(/\bYour payment received\b/gi, "Payment received")
    .replace(/\bYour credit added\b/gi, "Credit recorded")
    .replace(/\bNew service task created\b/gi, "New work assigned")
    .replace(/\bService task completed\b/gi, "Task completed");
  if (viewerRole !== "customer") return adminSafe;
  return adminSafe
    .replace(/\bNew work assigned\b/gi, "Shop assigned new work")
    .replace(/\bWork updated\b/gi, "Shop updated your work")
    .replace(/\bService task updated\b/gi, "Shop updated your work")
    .replace(/\bService task time updated\b/gi, "Shop updated your work time")
    .replace(/\bTask completed\b/gi, "Shop completed your task");
}

function formatSystemDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSystemMessageText(text: string, viewerRole: string) {
  return roleSafeSystemText(text, viewerRole).replace(
    /\b(Due|Date|Time):\s*(\d{4}-\d{2}-\d{2}T[^\s]+)/gi,
    (_match, label: string, value: string) =>
      `${label}: ${formatSystemDate(value)}`,
  );
}

function messageTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isTaskOrRentSystemMessage(message: Message) {
  const eventType = String(
    message.systemEventType || message.systemEventData?.eventType || "",
  ).toLowerCase();
  if (
    eventType.includes("work_task") ||
    eventType.includes("worktask") ||
    eventType.includes("tool_rent") ||
    eventType.includes("toolrent") ||
    eventType.includes("rent")
  )
    return true;
  const text = String(message.content || "").toLowerCase();
  return (
    /\b(service task|work assigned|work updated|task completed)\b/.test(text) ||
    /\b(tool rent|tool rental|rental|rent due|return due)\b/.test(text)
  );
}

const dayKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayLabel = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return "Today";
  if (dayKey(value) === dayKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

function stableKey(m: Message): string {
  if (m.uploading && m.clientMessageId) return `upload-${m.clientMessageId}`;
  return m.id;
}

function buildRenderItems(messages: Message[]): MessageItem[] {
  const COLLAGE_WINDOW_MS = 2 * 60 * 1000;
  const items: MessageItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const type = String(m.type || "").toLowerCase();
    const isMedia = type === "image" || type === "video";

    if (!isMedia) {
      items.push({
        kind: "single",
        key: stableKey(m),
        messages: [m],
        prev: i > 0 ? messages[i - 1] : null,
        next: i < messages.length - 1 ? messages[i + 1] : null,
      });
      continue;
    }

    const group: Message[] = [m];
    let j = i + 1;
    while (j < messages.length) {
      const cur = messages[j - 1];
      const nxt = messages[j];
      const curType = String(cur.type || "").toLowerCase();
      const nxtType = String(nxt.type || "").toLowerCase();
      const bothMedia =
        (curType === "image" || curType === "video") &&
        (nxtType === "image" || nxtType === "video");
      const sameSender = String(cur.senderId) === String(nxt.senderId);
      const within =
        Math.abs(
          new Date(cur.timestamp).getTime() - new Date(nxt.timestamp).getTime(),
        ) <= COLLAGE_WINDOW_MS;
      if (!bothMedia || !sameSender || !within) break;
      group.push(nxt);
      j += 1;
    }

    if (group.length >= 2) {
      items.push({
        kind: "collage",
        key: `collage-${stableKey(group[0])}-${stableKey(group[group.length - 1])}`,
        messages: group,
        prev: i > 0 ? messages[i - 1] : null,
        next: j < messages.length ? messages[j] : null,
      });
      i = j - 1;
    } else {
      items.push({
        kind: "single",
        key: stableKey(m),
        messages: [m],
        prev: i > 0 ? messages[i - 1] : null,
        next: i < messages.length - 1 ? messages[i + 1] : null,
      });
    }
  }
  return items;
}

const MessageRow = React.memo(function MessageRow({
  item,
  me,
  viewerRole,
  firstUnreadId,
  unreadCount,
  onMessageEdit,
  onMessageDelete,
  onMessageForward,
  onMessageReply,
  onMessageResend,
  onMessageSelect,
  selectedMessages,
  selectMode,
  onOpenImage,
}: {
  item: MessageItem;
  me: string;
  viewerRole: string;
  firstUnreadId: string | null;
  unreadCount: number;
  onMessageEdit?: (message: Message) => void;
  onMessageDelete?: (message: Message) => void;
  onMessageForward?: (message: Message) => void;
  onMessageReply?: (message: Message) => void;
  onMessageResend?: (message: Message) => void;
  onMessageSelect?: (message: Message) => void;
  selectedMessages: Set<string>;
  selectMode: boolean;
  onOpenImage?: (payload: { src: string; messageId: string }) => void;
}) {
  const firstMessage = item.messages[0];
  const isSelected = selectedMessages.has(firstMessage.id);

  const showDateSeparator =
    dayKey(firstMessage.timestamp) !== dayKey(item.prev?.timestamp);

  return (
    <>
      {showDateSeparator && (
        <div className="sticky top-2 z-10 flex justify-center py-2">
          <div className="rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-sm backdrop-blur">
            {dayLabel(firstMessage.timestamp)}
          </div>
        </div>
      )}
      <div id={`msg-${firstMessage.id}`}>
        {firstUnreadId &&
          (item.kind === "single"
            ? firstUnreadId === firstMessage.id
            : item.messages.some((m) => m.id === firstUnreadId)) && (
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-emerald-500/30" />
              <div className="bg-gray-900 px-2 text-xs text-emerald-400">
                {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
              </div>
              <div className="h-px flex-1 bg-emerald-500/30" />
            </div>
          )}

        {item.kind === "single" ? (
          firstMessage.messageKind === "system" ? (
            isTaskOrRentSystemMessage(firstMessage) ? (
              <div
                className={`flex py-1 ${viewerRole === "customer" ? "justify-start" : "justify-end"}`}
              >
                <div className="relative max-w-[min(66%,23rem)] rounded-2xl border border-slate-600/40 bg-slate-800/70 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-200 shadow-sm sm:max-w-[86%]">
                  <span className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {formatSystemMessageText(
                      String(firstMessage.content || "").trim(),
                      viewerRole,
                    ) || "Group activity"}
                  </span>
                  <span className="mt-1 block text-right text-[9px] leading-none text-slate-300/80">
                    {messageTime(firstMessage.timestamp)}
                  </span>
                </div>
              </div>
            ) : (
              <SystemMessageRow
                message={firstMessage}
                viewerRole={viewerRole}
              />
            )
          ) : (
            <MessageBubble
              message={firstMessage}
              prev={item.prev}
              next={item.next}
              onEdit={onMessageEdit}
              onDelete={onMessageDelete}
              onForward={onMessageForward}
              onReply={onMessageReply}
              onResend={onMessageResend}
              onSelect={onMessageSelect}
              isSelected={isSelected}
              selectMode={selectMode}
              onOpenImage={onOpenImage}
            />
          )
        ) : (
          <>
            {item.messages.slice(1).map((m) => (
              <div
                key={`anchor-${m.id}`}
                id={`msg-${m.id}`}
                className="h-0 overflow-hidden"
              />
            ))}
            <MediaCollageBubble
              messages={item.messages}
              isCurrentUser={String(item.messages[0].senderId) === me}
              onOpenImage={onOpenImage}
            />
          </>
        )}
      </div>
    </>
  );
});

const SystemMessageRow = React.memo(function SystemMessageRow({
  message,
  viewerRole,
}: {
  message: Message;
  viewerRole: string;
}) {
  const router = useRouter();

  const getBillEventData = (msg: Message) => {
    const tempId = String(msg.tempId || "");
    const inferredBillId = tempId.startsWith("event:bill_created:")
      ? tempId.replace("event:bill_created:", "")
      : "";
    if (
      msg.systemEventType === "bill_created" ||
      msg.systemEventData?.eventType === "bill_created"
    ) {
      return msg.systemEventData || { billId: inferredBillId };
    }
    if (
      inferredBillId ||
      /bill is created|bill created/i.test(String(msg.content || ""))
    ) {
      return { billId: inferredBillId };
    }
    return null;
  };

  const billEventData = getBillEventData(message);
  const isClickable = Boolean(billEventData);

  const openBillEvent = () => {
    if (!billEventData) return;
    const rawBillId = String(billEventData?.billId || "").trim();
    if (viewerRole === "customer") {
      router.push(
        rawBillId
          ? `/customer/bills?open=${encodeURIComponent(rawBillId)}`
          : "/customer/bills",
      );
      return;
    }
    const customerId = encodeURIComponent(
      String(billEventData?.customerId || ""),
    );
    if (customerId) {
      router.push(
        rawBillId
          ? `/admin/customers/${customerId}/bills?open=${encodeURIComponent(rawBillId)}`
          : `/admin/customers/${customerId}/bills`,
      );
      return;
    }
    router.push(
      rawBillId
        ? `/admin/billing?open=${encodeURIComponent(rawBillId)}`
        : "/admin/billing",
    );
  };

  return (
    <div className="flex justify-center py-4 sm:py-1.5">
      <button
        type="button"
        onClick={openBillEvent}
        disabled={!isClickable}
        className={`relative max-w-[min(92%,22rem)] rounded-2xl border border-slate-600/40 bg-slate-800/70 px-3.5 pb-3 pt-4 text-left text-[11px] leading-relaxed text-slate-300 shadow-sm sm:max-w-[86%] sm:px-3 sm:py-1.5 ${
          isClickable
            ? "cursor-pointer transition hover:border-emerald-400/50 hover:bg-slate-700/80 hover:text-emerald-100"
            : "cursor-default"
        }`}
      >
        <span className="absolute left-1/2 top-0 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-emerald-400/35 bg-slate-900 px-2 py-0.5 text-[9px] font-medium leading-none text-emerald-200 shadow-sm sm:hidden">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Shop App
        </span>
        <span className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {formatSystemMessageText(
            String(message.content || "").trim(),
            viewerRole,
          ) || "Group activity"}
        </span>
      </button>
    </div>
  );
});

const TypingIndicator = React.memo(function TypingIndicator({
  text,
}: {
  text: string;
}) {
  if (!text) return null;
  return (
    <div className="flex justify-start py-1">
      <div className="inline-flex max-w-[75%] items-end gap-1 rounded-2xl text-xs text-emerald-300 shadow-sm">
        <span className="truncate">{text}</span>
        <span className="flex items-end gap-0.5">
          {[0, 0.18, 0.36].map((delay, index) => (
            <span
              key={`dot-${index}`}
              className="size-[3.5px] rounded-full bg-emerald-300/90"
              style={{
                animation: "typing-bounce 1.3s ease-in-out infinite",
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
});

const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  initialLoading = false,
  onMessageEdit,
  onMessageDelete,
  onMessageForward,
  onMessageReply,
  onMessageResend,
  onMessageSelect,
  selectedMessages = new Set(),
  selectMode = false,
  unreadCount = 0,
  firstUnreadId = null,
  typingText,
  onScrollToBottom,
  onViewportChange,
  onOpenImage,
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const user = useAuthStore((s) => s.user as any);
  const viewerRole = String(user?.role || "");
  const me = String(user?.id || user?._id || "");
  const [atBottom, setAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const loadingRef = useRef(false);
  const prevMsgLenRef = useRef(0);
  const prevAtBottomRef = useRef(true);
  const userScrollingUpRef = useRef(false);

  const renderItems = useMemo(() => buildRenderItems(messages), [messages]);
  const itemCount = renderItems.length + (typingText ? 1 : 0);

  // Memoize selectedMessages set for itemContent
  const selectedMessagesRef = useRef(selectedMessages);
  selectedMessagesRef.current = selectedMessages;

  // Scroll to bottom on initial load (only once)
  useEffect(() => {
    if (!initialLoading && messages.length > 0 && prevMsgLenRef.current === 0) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: renderItems.length - 1,
          behavior: "auto",
        });
      });
    }
  }, [initialLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track if user scrolls up
  const handleScroll = useCallback(
    (scrollTop: number) => {
      const isNearBottom = scrollTop < 100;
      const wasAtBottom = prevAtBottomRef.current;
      prevAtBottomRef.current = isNearBottom;
      setAtBottom(isNearBottom);
      if (!isNearBottom && wasAtBottom) {
        userScrollingUpRef.current = true;
      }
      if (isNearBottom) {
        userScrollingUpRef.current = false;
      }
      if (isNearBottom !== wasAtBottom) {
        onViewportChange?.({ atBottom: isNearBottom });
      }
    },
    [onViewportChange],
  );

  // Only follow output when user is at bottom
  const followOutput = useCallback<(isAtBottom: boolean) => boolean>(() => {
    return prevAtBottomRef.current;
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !onLoadMore) return;
    loadingRef.current = true;
    try {
      await onLoadMore();
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, onLoadMore]);

  const scrollToBottom = useCallback(() => {
    setShowScrollButton(false);
    prevAtBottomRef.current = true;
    setAtBottom(true);
    userScrollingUpRef.current = false;
    virtuosoRef.current?.scrollToIndex({
      index: renderItems.length - 1,
      behavior: "smooth",
    });
    onScrollToBottom?.();
  }, [renderItems.length, onScrollToBottom]);

  const itemContent = useCallback(
    (index: number) => {
      if (index === renderItems.length && typingText) {
        return <TypingIndicator text={typingText} />;
      }
      const item = renderItems[index];
      if (!item) return null;
      const selSet = selectedMessagesRef.current;
      return (
        <MessageRow
          item={item}
          me={me}
          viewerRole={viewerRole}
          firstUnreadId={firstUnreadId}
          unreadCount={unreadCount}
          onMessageEdit={onMessageEdit}
          onMessageDelete={onMessageDelete}
          onMessageForward={onMessageForward}
          onMessageReply={onMessageReply}
          onMessageResend={onMessageResend}
          onMessageSelect={onMessageSelect}
          selectedMessages={selSet}
          selectMode={selectMode}
          onOpenImage={onOpenImage}
        />
      );
    },
    [
      renderItems,
      typingText,
      me,
      viewerRole,
      firstUnreadId,
      unreadCount,
      onMessageEdit,
      onMessageDelete,
      onMessageForward,
      onMessageReply,
      onMessageResend,
      onMessageSelect,
      selectMode,
      onOpenImage,
    ],
  );

  const HeaderComponent = useCallback(() => {
    if (!isLoading) return null;
    return (
      <div className="flex justify-center py-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs text-slate-300 backdrop-blur">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400/35 border-t-emerald-400" />
          Loading history...
        </div>
      </div>
    );
  }, [isLoading]);

  const FooterComponent = useCallback(() => {
    if (typingText) return null;
    return <div className="h-2" />;
  }, [typingText]);

  if (initialLoading) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-white/[0.018] backdrop-blur-[2px]">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col space-y-0 overflow-y-auto px-4 py-3 sm:px-4">
          <div className="space-y-2 px-1 py-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const mine = idx % 3 === 0;
              return (
                <div
                  key={`skeleton-${idx}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`animate-pulse rounded-2xl border border-slate-700/70 bg-slate-800/70 ${mine ? "w-28" : "w-40"} h-10`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-white/[0.018] backdrop-blur-[2px]">
        <div className="flex h-full items-center justify-center px-4 text-slate-300">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-5 py-4 text-center shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-1 text-base font-medium text-slate-200">
              No messages yet
            </div>
            <div className="text-sm text-slate-400">Start the conversation</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden overscroll-contain bg-white/[0.018] backdrop-blur-[2px] px-1 sm:px-2">
      <Virtuoso
        ref={virtuosoRef}
        className="no-scrollbar h-full w-full"
        totalCount={itemCount}
        itemContent={itemContent}
        components={{
          Header: HeaderComponent,
          Footer: FooterComponent,
        }}
        atTopThreshold={200}
        atTopStateChange={(atTop) => {
          if (atTop && hasMore && !loadingRef.current) {
            handleLoadMore();
          }
        }}
        followOutput={followOutput}
        initialTopMostItemIndex={renderItems.length - 1}
        increaseViewportBy={{ top: 800, bottom: 400 }}
        overscan={500}
        style={{ height: "100%", width: "100%", overflowX: "hidden" as const, overscrollBehavior: "contain" as unknown as "auto" | "contain" | "none" }}
      />
      {(!atBottom || showScrollButton) && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-3 z-10 rounded-full border border-gray-700 bg-gray-800 p-3 text-gray-300 shadow-lg transition-colors hover:bg-gray-700 hover:text-white md:bottom-4 md:right-4"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <ChevronDown size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-xs leading-5 text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
      <style jsx global>{`
        @keyframes typing-bounce {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1.5px);
          }
        }
      `}</style>
    </div>
  );
};

export default MessagesList;
