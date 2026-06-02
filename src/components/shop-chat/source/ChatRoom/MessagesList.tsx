import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import MessageBubble from "../MessageBubble";
import MediaCollageBubble from "../MessageBubble/MediaCollageBubble";
import { Message } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const me = String(useAuthStore((s) => (s.user as any)?.id || (s.user as any)?._id || ""));
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScrollNext, setAutoScrollNext] = useState(true);
  const loadingRef = useRef(false);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (autoScrollNext && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, autoScrollNext]);

  useEffect(() => {
    if (!typingText || !autoScrollNext || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typingText, autoScrollNext]);

  // Handle scroll events
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const publishViewport = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom <= 150;
      setShowScrollButton(!isNearBottom);
      setAutoScrollNext(isNearBottom);
      onViewportChange?.({ atBottom: isNearBottom });
    };

    const handleScroll = async () => {
      const { scrollTop, scrollHeight, clientHeight } = element;

      // Load more messages when near top
      if (!loadingRef.current && scrollTop <= 40 && hasMore && onLoadMore) {
        loadingRef.current = true;
        const prevHeight = scrollHeight;
        try {
          await onLoadMore();
          // Maintain scroll position after loading
          setTimeout(() => {
            if (element) {
              const newHeight = element.scrollHeight;
              element.scrollTop = newHeight - prevHeight + scrollTop;
            }
          }, 0);
        } finally {
          loadingRef.current = false;
        }
      }

      publishViewport();
    };

    publishViewport();
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [hasMore, onLoadMore, onViewportChange]);

  // Keep bottom anchored when content height grows (e.g. media loads) and user is near bottom
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

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScrollButton(false);
      setAutoScrollNext(true);
      onScrollToBottom?.();
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const COLLAGE_WINDOW_MS = 2 * 60 * 1000;
  const renderItems: Array<
    | {
        kind: "single";
        message: Message;
        prev: Message | null;
        next: Message | null;
      }
    | {
        kind: "collage";
        messages: Message[];
        prev: Message | null;
        next: Message | null;
      }
  > = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const type = String(m.type || "").toLowerCase();
    const isMedia = type === "image" || type === "video";
    if (!isMedia) {
      renderItems.push({
        kind: "single",
        message: m,
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
      renderItems.push({
        kind: "collage",
        messages: group,
        prev: i > 0 ? messages[i - 1] : null,
        next: j < messages.length ? messages[j] : null,
      });
      i = j - 1;
    } else {
      renderItems.push({
        kind: "single",
        message: m,
        prev: i > 0 ? messages[i - 1] : null,
        next: i < messages.length - 1 ? messages[i + 1] : null,
      });
    }
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-x-hidden">
      <div
        ref={scrollRef}
        id="messages-scroll"
        className="no-scrollbar mx-auto h-full min-h-0 w-full max-w-[1400px] space-y-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 sm:px-4 sm:py-2"
      >
        {/* Loading indicator at top */}
        {isLoading && (
          <div className="sticky top-0 z-20 flex justify-center py-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs text-slate-300 backdrop-blur">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400/35 border-t-emerald-400" />
              Loading history...
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {renderItems.map((item) => {
            const key =
              item.kind === "single"
                ? item.message.tempId || item.message.id
                : `collage-${item.messages[0].tempId || item.messages[0].id}-${item.messages[item.messages.length - 1].tempId || item.messages[item.messages.length - 1].id}`;
            const firstMessage =
              item.kind === "single" ? item.message : item.messages[0];
            const isSelected = selectedMessages.has(firstMessage.id);

            return (
              <motion.div
                key={key}
                id={`msg-${firstMessage.id}`}
                layout
                initial={{
                  opacity: 0,
                  y: 6,
                  x: String(firstMessage.senderId) === me ? 6 : -6,
                  scale: 0.995,
                }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.995 }}
                transition={{
                  duration: 0.18,
                  ease: [0.22, 0.61, 0.36, 1],
                }}
              >
                {firstUnreadId &&
                  (item.kind === "single"
                    ? firstUnreadId === item.message.id
                    : item.messages.some((m) => m.id === firstUnreadId)) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 py-2"
                    >
                      <div className="h-px flex-1 bg-emerald-500/30" />
                      <div className="bg-gray-900 px-2 text-xs text-emerald-400">
                        {unreadCount} unread message
                        {unreadCount !== 1 ? "s" : ""}
                      </div>
                      <div className="h-px flex-1 bg-emerald-500/30" />
                    </motion.div>
                  )}

                {item.kind === "single" ? (
                  item.message.messageKind === "system" ? (
                    <div className="flex justify-center py-1.5">
                      <div className="max-w-[86%] rounded-full border border-slate-600/40 bg-slate-800/70 px-3 py-1 text-center text-[11px] text-slate-300">
                        {String(item.message.content || "").trim() || "Group activity"}
                      </div>
                    </div>
                  ) : (
                    <MessageBubble
                      message={item.message}
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
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {initialLoading && messages.length === 0 && (
          <div className="space-y-2 px-1 py-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const mine = idx % 3 === 0;
              return (
                <div
                  key={`msg-skeleton-${idx}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`animate-pulse rounded-2xl border border-slate-700/70 bg-slate-800/70 ${
                      mine ? "w-28" : "w-40"
                    } h-10`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {messages.length === 0 && !isLoading && !initialLoading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-lg mb-2">No messages yet</div>
              <div className="text-sm">Start the conversation!</div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {typingText && (
            <motion.div
              key="typing-indicator"
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

      {/* Scroll to bottom button */}
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
};

export default MessagesList;
