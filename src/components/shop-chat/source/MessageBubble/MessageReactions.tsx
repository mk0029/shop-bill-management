import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { reactToShopChatMessage } from "@/lib/shop-chat/api";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/lib/types";
import { safeUserName } from "@/lib/display-text";

interface MessageReactionsProps {
  message: Message;
  isCurrentUser: boolean;
  contentText: string;
  mediaLabel?: string | null;
}

const QUICK_REACTION_OPTIONS = ["❤️", "😂", "👍", "😮", "😢", "😡"];
const EXTENDED_REACTION_OPTIONS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "🥰",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😴",
  "🤯",
  "👏",
  "🙏",
  "🔥",
  "✨",
  "🎉",
  "✅",
  "❌",
  "⚠️",
];
const ALL_REACTIONS = [...new Set([...QUICK_REACTION_OPTIONS, ...EXTENDED_REACTION_OPTIONS])];

const MessageReactions: React.FC<MessageReactionsProps> = ({ message, isCurrentUser }) => {
  const user = useAuthStore((state) => state.user as any);
  const myUserId = String(user?.id || user?._id || "");
  const [localReactions, setLocalReactions] = useState(message.reactions || []);
  const [showPanel, setShowPanel] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);

  React.useEffect(() => setLocalReactions(message.reactions || []), [message.reactions]);

  const signature = useMemo(
    () => localReactions.map((reaction) => `${reaction.userId}:${reaction.emoji}`).join("|"),
    [localReactions],
  );

  const applyReaction = async (emoji: string) => {
    const previous = localReactions;
    const existing = previous.find((reaction) => String(reaction.userId) === myUserId);
    const nextEmoji = existing?.emoji === emoji ? null : emoji;
    const next = nextEmoji
      ? [
          ...previous.filter((reaction) => String(reaction.userId) !== myUserId),
          {
            userId: myUserId,
            userName: safeUserName(user?.name || user?.email, "You"),
            emoji: nextEmoji,
            timestamp: new Date().toISOString(),
          },
        ]
      : previous.filter((reaction) => String(reaction.userId) !== myUserId);

    setLocalReactions(next);
    setBurstEmoji(emoji);
    window.setTimeout(() => setBurstEmoji(null), 520);
    try {
      const response = await reactToShopChatMessage(message.id, nextEmoji);
      setLocalReactions(response.message.reactions || []);
    } catch {
      setLocalReactions(previous);
    }
  };

  return (
    <>
      <div
        className={`absolute -top-6 ${isCurrentUser ? "right-2" : "left-2"} hidden items-center gap-1 rounded-full border border-gray-700 bg-gray-800/90 px-2 py-0.5 text-base shadow-md group-hover:flex`}
        style={{ backdropFilter: "blur(6px)" }}
      >
        {QUICK_REACTION_OPTIONS.map((emoji) => (
          <motion.button
            key={emoji}
            type="button"
            whileHover={{ scale: 1.14, y: -1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => applyReaction(emoji)}
            className="transition-transform"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
        <button
          type="button"
          onClick={() => setShowPanel((value) => !value)}
          className="rounded-full px-1.5 text-base text-cyan-200 hover:bg-gray-700/70"
          aria-label="More reactions"
        >
          +
        </button>
      </div>

      <AnimatePresence>
        {burstEmoji && (
          <motion.div
            key={`${message.id}-${burstEmoji}-${signature}`}
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

      {localReactions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPanel((value) => !value)}
          className="absolute bottom-[-10px] flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px]"
          style={{ right: isCurrentUser ? 6 : undefined, left: !isCurrentUser ? 6 : undefined }}
        >
          {Array.from(new Set(localReactions.map((reaction) => reaction.emoji)))
            .slice(0, 3)
            .map((emoji, index) => (
              <span key={`${emoji}-${index}`}>{emoji}</span>
            ))}
          {localReactions.length > 1 && <span className="ml-1 text-gray-200">{localReactions.length}</span>}
        </button>
      )}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className={`absolute z-30 ${isCurrentUser ? "right-0" : "left-0"} top-7 w-52 rounded-xl border border-gray-700 bg-gray-800/95 p-2 shadow-xl backdrop-blur`}
          >
            <div className="mb-2 grid grid-cols-6 gap-1">
              {ALL_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    void applyReaction(emoji);
                    setShowPanel(false);
                  }}
                  className="rounded-md px-1 py-1.5 text-base hover:bg-gray-700/60"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {localReactions.length > 0 && (
              <div className="max-h-28 space-y-1 overflow-y-auto border-t border-gray-700/70 pt-2 text-xs text-gray-200">
                {localReactions.map((reaction, index) => (
                  <div key={`${reaction.userId}-${index}`} className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-700/60">
                    <span className="truncate">{safeUserName(reaction.userName || reaction.userId)}</span>
                    <span>{reaction.emoji}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageReactions;
