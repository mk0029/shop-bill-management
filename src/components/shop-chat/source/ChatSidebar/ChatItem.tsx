import React, { useRef, useState } from "react";
import { BellOff, Check, Pin, Star, Users, X } from "lucide-react";
import SmartPopup from "@/lib/ui/SmartPopup";
import { decodeTransportText } from "@/lib/messageCodec";

interface ChatItemProps {
  friend: {
    _id: string;
    name: string;
    avatar?: string;
    online: boolean;
    lastSeen?: string;
    statusText?: string;
    isGroup?: boolean;
    memberCount?: number;
    myRole?: string | null;
    rawGroupId?: string;
    settings?: { locked?: boolean };
  };
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: string;
    kind?: "text" | "media" | "reply" | "reaction";
    replyMeta?: any;
    reactionMeta?: any;
  };
  unreadCount: number;
  isTyping: boolean;
  isBlocked: boolean;
  blockMeta?: {
    byMe?: boolean;
    at?: string;
    requested?: boolean;
  };
  isPinned: boolean;
  isStarred: boolean;
  isMuted: boolean;
  isArchived: boolean;
  unblockRequest?: {
    id: string;
    from: { _id: string; name: string };
  };
  currentUserId: string;
  onSelect: () => void;
  onPin: () => void;
  onToggleStar: () => void;
  onMute: (mode: "always" | "1d" | "2d" | "1w" | "off") => void;
  onArchive: () => void;
  onMarkUnread: () => void;
  onDeleteChat: () => void;
  onApproveUnblock: () => void;
  onDeclineUnblock: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  friend,
  lastMessage,
  unreadCount,
  isTyping,
  isBlocked,
  blockMeta,
  isPinned,
  isStarred,
  isMuted,
  isArchived,
  unblockRequest,
  currentUserId,
  onSelect,
  onPin,
  onToggleStar,
  onMute,
  onArchive,
  onMarkUnread,
  onDeleteChat,
  onApproveUnblock,
  onDeclineUnblock,
}) => {
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [menuAnchorPoint, setMenuAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);
  const muteMenuRef = useRef<HTMLDivElement | null>(null);
  const isGroup = !!friend.isGroup;

  React.useEffect(() => {
    setAvatarLoaded(false);
    setAvatarErrored(false);
  }, [friend.avatar, friend._id]);

  const hideAvatar = !!isBlocked && !isGroup;
  const lastWasFromMe = lastMessage && String(lastMessage.senderId) === currentUserId;
  const showUnread = unreadCount > 0 && (!lastWasFromMe || isGroup);
  const presenceText = friend.statusText || (friend.online ? "Online" : friend.lastSeen ? `Last seen ${new Date(friend.lastSeen).toLocaleString()}` : "");

  const formatPreview = () => {
    if (!lastMessage) {
      if (isGroup) {
        return `${friend.memberCount || 0} members${friend.settings?.locked ? " · Locked" : ""}`;
      }
      return "";
    }
    const kind = lastMessage.kind || "text";

    if (kind === "reply" && lastMessage.replyMeta) {
      const repliedByMe = String(lastMessage.senderId) === currentUserId;
      const toMe = String(lastMessage.replyMeta.toSenderId || "") === currentUserId;
      const base = lastMessage.replyMeta.toText || lastMessage.content || "[message]";
      if (repliedByMe) return `You replied to: ${base}`;
      if (toMe) return `${friend.name || "They"} replied to you: ${base}`;
      return `${friend.name || "They"} replied: ${base}`;
    }

    if (kind === "reaction" && lastMessage.reactionMeta) {
      const who =
        String(lastMessage.senderId) === currentUserId
          ? "You"
          : lastMessage.reactionMeta.byUserName || friend.name || "They";
      const base = lastMessage.reactionMeta.toText || lastMessage.content || "[message]";
      const emoji = String(lastMessage.reactionMeta.emoji || "").trim();
      return emoji ? `${who} reacted (${emoji}) : ${base}` : `${who} reacted: ${base}`;
    }

    if (kind === "media") {
      const mine = String(lastMessage.senderId) === currentUserId;
      const who = mine ? "You" : friend.name || "They";
      const m = /\[(\w+)\]/.exec(lastMessage.content || "");
      const t = (m?.[1] || "").toLowerCase();
      const label =
        t === "image"
          ? "Photo"
          : t === "video"
            ? "Video"
            : t === "audio"
              ? "Voice note"
              : "File";
      return `${who} sent a ${label}`;
    }

    const raw = lastMessage.content || "";
    const hasReadableChars = /[\s.,!?;:]/.test(raw);
    const isB64Likely =
      !hasReadableChars && /^[A-Za-z0-9+/=\n\r]+$/.test(raw) && raw.length % 4 === 0 && raw.length >= 12;
    const display = isB64Likely ? decodeTransportText(raw) : raw;
    const trimmed = display.replace(/\s+/g, " ").trim();
    const truncated = trimmed.length > 42 ? `${trimmed.slice(0, 41)}...` : trimmed;
    return String(lastMessage.senderId) === currentUserId ? `You: ${truncated}` : truncated;
  };

  let lastText = formatPreview();
  let lastTime = lastMessage?.timestamp
    ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  if (!isGroup && isBlocked) {
    lastText = blockMeta?.byMe
      ? `You blocked ${friend.name || "this user"}`
      : `${friend.name || "This user"} blocked you${blockMeta?.requested ? " · Requested" : ""}`;
    if (blockMeta?.at) {
      lastTime = new Date(blockMeta.at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isGroup) return;
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new Event("smartpopup:close-all" as any));
    setShowMuteOptions(false);
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setItemMenuOpen(true);
  };

  const muteOptions = [
    { mode: "off" as const, label: "Unmute" },
    { mode: "1d" as const, label: "Mute for 1 day" },
    { mode: "2d" as const, label: "Mute for 2 days" },
    { mode: "1w" as const, label: "Mute for 1 week" },
    { mode: "always" as const, label: "Mute always" },
  ];

  return (
    <li
      className={`relative flex w-full cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-gray-800/50 ${isArchived ? "opacity-75" : ""}`}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      title={!isBlocked && friend.lastSeen ? `Last seen ${new Date(friend.lastSeen).toLocaleString()}` : ""}
    >
      <div className="relative shrink-0">
        <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-emerald-700/70 text-xs font-semibold text-white ring-1 ring-emerald-400/25">
          {String(friend.name || "U").trim().charAt(0).toUpperCase() || "U"}
          {!hideAvatar && friend.avatar && !avatarErrored && (
            <img
              src={friend.avatar}
              className={`absolute inset-0 h-9 w-9 rounded-full object-cover transition-opacity duration-200 ${avatarLoaded ? "opacity-100" : "opacity-0"}`}
              alt={friend.name}
              onLoad={() => setAvatarLoaded(true)}
              onError={() => {
                setAvatarLoaded(false);
                setAvatarErrored(true);
              }}
            />
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-gray-900 ${
            isBlocked ? "bg-rose-500" : friend.online ? "bg-emerald-500" : "bg-gray-500"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {isPinned && <Pin size={12} className="shrink-0 text-gray-400" />}
            {isGroup && <Users size={12} className="shrink-0 text-sky-300/90" />}
            <span className="min-w-0 truncate text-[15px] font-medium text-white">{friend.name}</span>
            {presenceText && (
              <span className={`hidden max-w-[4.75rem] shrink-0 truncate text-[10px] sm:inline ${friend.online ? "text-emerald-300" : "text-gray-500"}`}>
                · {presenceText}
              </span>
            )}
          </div>
          <div className="shrink-0 text-[10px] text-gray-400">{lastTime}</div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div
            className={`min-w-0 flex-1 truncate text-xs ${
              isBlocked ? "text-rose-400" : isTyping ? "text-emerald-400" : showUnread ? "text-gray-100" : "text-gray-400"
            }`}
          >
            {unblockRequest && !isGroup
              ? "Unblock request"
              : isTyping && !isBlocked
                ? "typing..."
                : lastText}
          </div>

          <div className="flex items-center gap-1">
            {isMuted && !isGroup && (
              <span className="text-gray-400" title="Muted">
                <BellOff size={14} />
              </span>
            )}

            {unblockRequest && !isGroup ? (
              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveUnblock();
                  }}
                  className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-500"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeclineUnblock();
                  }}
                  className="rounded bg-gray-600 px-2 py-0.5 text-[10px] text-white hover:bg-gray-500"
                >
                  Decline
                </button>
              </div>
            ) : showUnread ? (
              <span className="min-w-5 rounded-full bg-emerald-600 px-1 text-center text-[10px] leading-5 text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!isGroup && (
        <SmartPopup
          anchorPoint={menuAnchorPoint ?? undefined}
          open={itemMenuOpen}
          onClose={() => {
            setItemMenuOpen(false);
            setShowMuteOptions(false);
          }}
          className="w-48"
        >
          <div className="rounded-md border border-gray-700 bg-gray-800 py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onPin();
                setItemMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
            >
              {isPinned ? "Unpin chat" : "Pin chat"}
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleStar();
                setItemMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700"
            >
              <Star size={14} className={isStarred ? "text-yellow-300" : "text-gray-300"} />
              {isStarred ? "Unstar chat" : "Star chat"}
            </button>

            <button
              type="button"
              onClick={() => {
                onMarkUnread();
                setItemMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
            >
              Mark as unread
            </button>

            <button
              type="button"
              onClick={() => {
                onArchive();
                setItemMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
            >
              {isArchived ? "Unarchive chat" : "Archive chat"}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMuteOptions((value) => !value)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
              >
                {isMuted ? "Unmute" : "Mute notifications"}
              </button>
              {showMuteOptions && (
                <div
                  ref={muteMenuRef}
                  className="absolute left-full top-0 z-50 ml-1 min-w-[140px] rounded-md border border-gray-700 bg-gray-800 py-1 shadow-lg"
                >
                  {muteOptions.map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        onMute(mode);
                        setShowMuteOptions(false);
                        setItemMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-gray-700" />
            <button
              type="button"
              onClick={() => {
                onDeleteChat();
                setItemMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-gray-700"
            >
              Delete chat
            </button>
          </div>
        </SmartPopup>
      )}
    </li>
  );
};

export default ChatItem;
