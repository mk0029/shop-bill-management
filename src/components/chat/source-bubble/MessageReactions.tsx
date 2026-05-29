import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "@/lib/ui/Portal";
import { useSmartPlacement } from "@/lib/ui/useSmartPlacement";
import { useDmSocket } from "@/lib/socketContext";
import { reactToMessage } from "@/lib/api";
import { Message } from "@/lib/types";
import { useChatStore as useBaseChatStore } from "@/store/chat-store";
import { useUserStore } from "@/store/userStore";

interface MessageReactionsProps {
  message: Message;
  isCurrentUser: boolean;
  contentText: string;
  mediaLabel?: string | null;
}

const QUICK_REACTION_OPTIONS = [
  "\u2764\ufe0f",
  "\ud83d\ude02",
  "\ud83d\udc4d",
  "\ud83d\ude2e",
  "\ud83d\ude22",
  "\ud83d\ude21",
];

const EXTENDED_REACTION_OPTIONS = [
  // faces
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "🙂",
  "🙃",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😗",
  "😚",
  "😙",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤭",
  "🫢",
  "🫣",
  "🤫",
  "🤔",
  "🫡",
  "🤐",
  "🤨",
  "😐",
  "😑",
  "😶",
  "🫥",
  "😏",
  "😒",
  "🙄",
  "😬",
  "😮‍💨",
  "🤥",
  "😌",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "🥵",
  "🥶",
  "🥴",
  "😵",
  "😵‍💫",
  "🤯",
  "🤠",
  "🥳",
  "🥸",
  "😎",
  "🤓",
  "🧐",
  "😕",
  "🫤",
  "😟",
  "🙁",
  "☹️",
  "😮",
  "😯",
  "😲",
  "😳",
  "🥺",
  "🥹",
  "😦",
  "😧",
  "😨",
  "😰",
  "😥",
  "😢",
  "😭",
  "😱",
  "😖",
  "😣",
  "😞",
  "😓",
  "😩",
  "😫",
  "🥱",
  "😤",
  "😡",
  "😠",
  "🤬",
  "😈",
  "👿",
  "💀",
  "☠️",
  "💩",
  "🤡",
  "👹",
  "👺",
  "👻",
  "👽",
  "🤖",
  "🎃",
  // gestures & hands
  "👍",
  "👎",
  "👌",
  "🤌",
  "🤏",
  "✌️",
  "🤞",
  "🫰",
  "🤟",
  "🤘",
  "🤙",
  "👈",
  "👉",
  "👆",
  "🖕",
  "👇",
  "☝️",
  "🫵",
  "✋",
  "🤚",
  "🖐️",
  "🖖",
  "🫱",
  "🫲",
  "🫳",
  "🫴",
  "👏",
  "🙌",
  "👐",
  "🤲",
  "🤝",
  "🙏",
  "✍️",
  "💅",
  "🤳",
  "💪",
  // hearts & symbols
  "❤️",
  "🩷",
  "🧡",
  "💛",
  "💚",
  "🩵",
  "💙",
  "💜",
  "🖤",
  "🩶",
  "🤍",
  "🤎",
  "💔",
  "❤️‍🔥",
  "❤️‍🩹",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "☮️",
  "✝️",
  "☪️",
  "🕉️",
  "☸️",
  "✡️",
  "🔯",
  "🕎",
  "☯️",
  "☦️",
  "🛐",
  "⭐",
  "🌟",
  "✨",
  "⚡",
  "🔥",
  "💥",
  "💫",
  "💦",
  "💯",
  // objects / misc often used in chats
  "🎉",
  "🎊",
  "🎈",
  "🎁",
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "⚽",
  "🏀",
  "🏏",
  "🎮",
  "🎵",
  "🎶",
  "📸",
  "📷",
  "📹",
  "💻",
  "📱",
  "⌚",
  "💡",
  "💎",
  "🧿",
  "🪬",
  "🍿",
  "🍫",
  "🍕",
  "🍔",
  "🍟",
  "🍩",
  "🍪",
  "☕",
  "🍵",
  "🥤",
  "🍻",
  "🧃",
  "🍉",
  "🍓",
  "🍒",
  "🍎",
  "🍌",
  "🌶️",
  "🌮",
  "🌯",
  "🫶",
  "🧠",
  "👀",
  "🫂",
  "🚀",
  "🌈",
  "🌙",
  "☀️",
  "⛈️",
  "❄️",
  "🌊",
  // flags-like/common signs
  "✅",
  "❌",
  "⚠️",
  "❓",
  "❗",
  "➕",
  "➖",
  "➡️",
  "⬅️",
  "⬆️",
  "⬇️",
  "🔁",
  "🔂",
  "🔄",
  "⏳",
  "⌛",
];

const ALL_REACTIONS = [
  ...new Set([...QUICK_REACTION_OPTIONS, ...EXTENDED_REACTION_OPTIONS]),
];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  message,
  isCurrentUser,
  contentText,
  mediaLabel,
}) => {
  const { user } = useUserStore();
  const dmSocket = useDmSocket();
  const selectedChat = useBaseChatStore((s) => s.activeRoomId);
  const setLastForPeer = React.useCallback((_peer: string, _payload: unknown) => {}, []);
  const setOrMergeById = React.useCallback((messageId: string, patch: any) => {
    const snapshot = useBaseChatStore.getState().messagesByRoomId || {};
    const rooms = Object.keys(snapshot);
    const touched: string[] = [];
    for (const roomId of rooms) {
      const list = snapshot[roomId] || [];
      if (list.some((m) => m._id === messageId)) touched.push(roomId);
    }
    if (touched.length === 0) return;
    useBaseChatStore.setState((st) => {
      const next = { ...st.messagesByRoomId };
      for (const roomId of touched) {
        next[roomId] = (st.messagesByRoomId[roomId] || []).map((m) =>
          m._id === messageId ? ({ ...m, ...(patch || {}) } as any) : m,
        );
      }
      return { messagesByRoomId: next };
    });
  }, []);

  const [showReactionsPopup, setShowReactionsPopup] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [emojiPanelAnchor, setEmojiPanelAnchor] = useState<"quick" | "pill">(
    "quick",
  );
  const [emojiDraft, setEmojiDraft] = useState("");
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const quickBarRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const emojiInputRef = useRef<HTMLInputElement | null>(null);

  const { style: reactStyle, recompute: recomputeReact } = useSmartPlacement(
    pillRef as any,
    popupRef as any,
    {
      preferred: "bottom",
      margin: 8,
    },
  );
  const { style: quickStyle, recompute: recomputeQuick } = useSmartPlacement(
    quickBarRef as any,
    popupRef as any,
    {
      preferred: "top",
      margin: 8,
    },
  );

  const reactions = message.reactions || [];
  const hasReactions = reactions.length > 0;
  const reactionSignature = useMemo(
    () =>
      reactions
        .map((reaction) => `${reaction.userId}:${reaction.emoji}`)
        .join("|"),
    [reactions],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsCompactMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const syncKeyboard = () => {
      const viewportHeight = vv?.height || window.innerHeight;
      const viewportTop = vv?.offsetTop || 0;
      const inset = Math.max(
        0,
        window.innerHeight - (viewportHeight + viewportTop),
      );
      setKeyboardInset(inset);
      setKeyboardOpen(inset > 120);
    };
    syncKeyboard();
    vv?.addEventListener("resize", syncKeyboard);
    vv?.addEventListener("scroll", syncKeyboard);
    window.addEventListener("resize", syncKeyboard);
    return () => {
      vv?.removeEventListener("resize", syncKeyboard);
      vv?.removeEventListener("scroll", syncKeyboard);
      window.removeEventListener("resize", syncKeyboard);
    };
  }, []);

  useEffect(() => {
    if (!showEmojiPanel || !isCompactMobile) return;
    const t = window.setTimeout(() => {
      try {
        emojiInputRef.current?.focus({ preventScroll: true });
      } catch {}
    }, 30);
    return () => window.clearTimeout(t);
  }, [showEmojiPanel, isCompactMobile]);

  useEffect(() => {
    if (showReactionsPopup || showEmojiPanel) {
      setTimeout(() => recomputeReact(), 0);
      setTimeout(() => recomputeQuick(), 0);
    }
  }, [
    recomputeReact,
    recomputeQuick,
    showReactionsPopup,
    showEmojiPanel,
    emojiPanelAnchor,
  ]);

  useEffect(() => {
    const onGlobalClose = () => {
      setShowReactionsPopup(false);
      setShowEmojiPanel(false);
    };
    document.addEventListener(
      "smartpopup:close-all" as any,
      onGlobalClose as any,
    );
    return () =>
      document.removeEventListener(
        "smartpopup:close-all" as any,
        onGlobalClose as any,
      );
  }, []);

  useEffect(() => {
    if (!showReactionsPopup && !showEmojiPanel) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const inPopup = !!popupRef.current?.contains(target);
      const inQuick = !!quickBarRef.current?.contains(target);
      const inPill = !!pillRef.current?.contains(target);

      if (!inPopup && !inQuick && !inPill) {
        setShowReactionsPopup(false);
        setShowEmojiPanel(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowReactionsPopup(false);
        setShowEmojiPanel(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [showReactionsPopup, showEmojiPanel]);

  useEffect(() => {
    if (!burstEmoji) return;
    const timer = window.setTimeout(() => setBurstEmoji(null), 520);
    return () => window.clearTimeout(timer);
  }, [burstEmoji]);

  const onReact = async (emoji: string) => {
    const token = useUserStore.getState().token;
    const peerId = selectedChat;
    const mineId = user?.id;
    const previous = reactions.map((reaction) => ({ ...reaction }));
    const currentIndex = previous.findIndex(
      (reaction) => reaction.userId === mineId,
    );
    const timestamp = new Date().toISOString();
    let next = [...previous];

    if (currentIndex >= 0) {
      if (previous[currentIndex].emoji === emoji) {
        next.splice(currentIndex, 1);
      } else {
        next[currentIndex] = { ...previous[currentIndex], emoji, timestamp };
      }
    } else if (mineId) {
      next.push({
        userId: mineId,
        userName: user?.username || user?.email,
        emoji,
        timestamp,
      });
    }

    next = [...next].sort(
      (a, b) =>
        (Date.parse(String(a.timestamp || "")) || 0) -
        (Date.parse(String(b.timestamp || "")) || 0),
    );

    setOrMergeById(message.id, { id: message.id, reactions: next });
    setBurstEmoji(emoji);

    const previewText = mediaLabel || contentText;
    if (peerId) {
      const lastReact = next[next.length - 1];
      if (lastReact) {
        setLastForPeer(String(peerId), {
          content: previewText,
          timestamp: lastReact.timestamp || timestamp,
          senderId: String(lastReact.userId),
          kind: "reaction",
          reactionMeta: {
            byUserName: lastReact.userName,
            emoji: lastReact.emoji,
            toText: previewText,
          },
        });
      }
    }

    try {
      if (dmSocket?.connected) {
        await new Promise<void>((resolve, reject) => {
          dmSocket.emit(
            "message:react",
            { messageId: message.id, emoji },
            (response?: { ok?: boolean; error?: string }) => {
              if (response?.ok) {
                resolve();
                return;
              }
              reject(new Error(response?.error || "React failed"));
            },
          );
        });
        return;
      }

      if (token) {
        await reactToMessage(token, message.id, emoji);
        return;
      }

      throw new Error("Missing reaction transport");
    } catch {
      setOrMergeById(message.id, { id: message.id, reactions: previous });
    }
  };

  const applyEmojiFromDraft = () => {
    const matches = emojiDraft.match(/\p{Extended_Pictographic}\uFE0F?/gu);
    const picked =
      matches && matches.length > 0 ? matches[matches.length - 1] : null;
    if (!picked) return;
    onReact(picked);
    setEmojiDraft("");
    setShowEmojiPanel(false);
    setShowReactionsPopup(false);
  };

  const openNativeEmojiKeyboard = () => {
    try {
      const input = emojiInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const pos = input.value.length;
      input.setSelectionRange(pos, pos);
    } catch {}
  };

  return (
    <>
      <div
        ref={quickBarRef}
        className={`absolute -top-6 ${isCurrentUser ? "right-2" : "left-2"} ${showEmojiPanel && !isCompactMobile ? "flex" : "hidden group-hover:flex"} items-center gap-1 rounded-full border border-gray-700 bg-gray-800/90 px-2 py-0.5 text-base shadow-md`}
        style={{ backdropFilter: "blur(6px)" }}
      >
        {QUICK_REACTION_OPTIONS.map((emoji) => (
          <motion.button
            key={emoji}
            type="button"
            whileHover={{ scale: 1.14, y: -1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onReact(emoji)}
            className="transition-transform"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setEmojiPanelAnchor("quick");
            setShowEmojiPanel((value) => !value);
            setShowReactionsPopup(false);
          }}
          className="rounded-full px-1.5 text-base scale-125 text-cyan-200 hover:bg-gray-700/70"
          aria-label="More reactions"
          title="More reactions"
        >
          +
        </motion.button>
      </div>

      <AnimatePresence>
        {burstEmoji && (
          <motion.div
            key={`${message.id}-${burstEmoji}-${reactionSignature}`}
            initial={{ opacity: 0, y: 8, scale: 0.5 }}
            animate={{ opacity: 1, y: -18, scale: 1.15 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`pointer-events-none absolute ${isCurrentUser ? "right-5" : "left-5"} -top-3 z-20 text-lg`}
          >
            {burstEmoji}
          </motion.div>
        )}
      </AnimatePresence>

      {hasReactions && (
        <div
          className="absolute"
          style={{
            bottom: -10,
            right: isCurrentUser ? 6 : undefined,
            left: !isCurrentUser ? 6 : undefined,
          }}
        >
          <motion.div
            key={reactionSignature || "empty"}
            ref={pillRef}
            onClick={() => setShowReactionsPopup((value) => !value)}
            initial={{ opacity: 0.65, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 28 }}
            className="flex cursor-pointer items-center gap-1 rounded-full pl-2 pr-2 py-0.5 text-[13px]"
          >
            <span className="flex items-center gap-1">
              {Array.from(new Set(reactions.map((reaction) => reaction.emoji)))
                .slice(0, 3)
                .map((emoji, index) => (
                  <span key={`${emoji}-${index}`}>{emoji}</span>
                ))}
            </span>
            {reactions.length > 1 && (
              <span className="ml-1 text-gray-200">{reactions.length}</span>
            )}
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showEmojiPanel && (
          <Portal>
            <motion.div
              ref={popupRef}
              data-popup-root
              style={{
                position: "fixed",
                ...(isCompactMobile
                  ? {
                      left: 8,
                      right: 8,
                      bottom: `calc(${keyboardInset}px + env(safe-area-inset-bottom) + 8px)`,
                    }
                  : emojiPanelAnchor === "pill"
                    ? reactStyle
                    : quickStyle),
                ...(Object.keys(
                  isCompactMobile
                    ? { left: 8, right: 8 }
                    : emojiPanelAnchor === "pill"
                      ? reactStyle
                      : quickStyle,
                ).length === 0
                  ? {
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                    }
                  : {}),
                zIndex: 1600,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-xl border border-gray-700 bg-gray-800/95 p-2 shadow-xl backdrop-blur-sm ${isCompactMobile ? "w-auto" : "w-[min(92vw,17rem)]"} ${isCompactMobile ? "max-h-[56vh]" : ""} ${isCompactMobile && keyboardOpen ? "max-h-[36vh]" : ""}`}
            >
              <div className="mb-2 px-1 text-xs font-medium text-gray-300">
                React with emoji
              </div>
              <div
                className={`emoji-scroll mb-2 overflow-y-auto rounded-lg bg-gray-900/45 p-1 pr-1.5 ${isCompactMobile ? "max-h-[42vh]" : "max-h-60"} ${isCompactMobile && keyboardOpen ? "max-h-[24vh]" : ""}`}
                style={{ scrollbarWidth: "thin" }}
              >
                <div className="grid grid-cols-6 gap-1">
                  {ALL_REACTIONS.map((emoji) => (
                    <motion.button
                      key={`extra-${emoji}`}
                      type="button"
                      whileHover={{ scale: 1.12, y: -1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        onReact(emoji);
                        setShowEmojiPanel(false);
                      }}
                      className="rounded-md px-1 py-1.5 text-base hover:bg-gray-700/60"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/35 px-2 py-1.5">
                <input
                  ref={emojiInputRef}
                  value={emojiDraft}
                  onChange={(event) => setEmojiDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyEmojiFromDraft();
                    }
                  }}
                  placeholder="Use keyboard emoji..."
                  className="w-full bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-400"
                  autoFocus
                />
                {isCompactMobile && (
                  <button
                    type="button"
                    onClick={openNativeEmojiKeyboard}
                    className="rounded-md bg-slate-700/80 px-2 py-1 text-[10px] font-medium text-slate-100 hover:bg-slate-600"
                    title="Open keyboard"
                  >
                    🙂
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyEmojiFromDraft}
                  className="rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-400"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReactionsPopup && hasReactions && (
          <Portal>
            <motion.div
              ref={popupRef}
              data-popup-root
              style={{ position: "fixed", ...reactStyle, zIndex: 50 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border border-gray-700 bg-gray-800/95 p-2 shadow-xl backdrop-blur-sm"
            >
              <div className="mb-2 px-1 text-xs text-gray-300">Who reacted</div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {reactions.map((reaction, index) => {
                  const isMine =
                    String(reaction.userId) === String(user?.id || "");
                  return (
                    <motion.div
                      key={`${reaction.userId}-${reaction.emoji}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`flex items-center gap-2 rounded px-2 py-1 ${isMine ? "cursor-pointer hover:bg-gray-700/70" : "hover:bg-gray-700/50"}`}
                      onClick={() => {
                        if (!isMine) return;
                        onReact(reaction.emoji);
                      }}
                      title={
                        isMine ? "Click to remove your reaction" : undefined
                      }
                    >
                      <span className="text-sm">{reaction.emoji}</span>
                      <span className="truncate text-xs text-gray-300">
                        {reaction.userName || `User ${reaction.userId}`}
                      </span>
                      {isMine && (
                        <span className="ml-auto text-[10px] text-rose-300/90">
                          Tap to remove
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-gray-700 pt-2">
                <div className="flex items-center gap-1">
                  {QUICK_REACTION_OPTIONS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ scale: 1.12, y: -1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        onReact(emoji);
                        setShowReactionsPopup(false);
                      }}
                      className="rounded p-1 text-sm hover:bg-gray-700/50"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiPanelAnchor("pill");
                      setShowEmojiPanel(true);
                      setShowReactionsPopup(false);
                    }}
                    className="rounded px-1.5 py-1 text-sm text-cyan-200 hover:bg-gray-700/50 scale-125"
                    title="More reactions"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageReactions;
