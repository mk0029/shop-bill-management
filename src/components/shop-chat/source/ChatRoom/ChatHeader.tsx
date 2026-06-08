import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, MoreVertical, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import ChatMenu from "@/components/shop-chat/source/ChatMenu";
import { safeInitial, safeUserName } from "@/lib/display-text";

interface ChatHeaderProps {
  peer: {
    id: string;
    name?: string;
    avatar?: string;
    online?: boolean;
    lastSeen?: string;
  } | null;
  typingLabel?: string;
  statusLabel?: string;
  connected?: boolean;
  onSearch?: () => void;
  onBack?: () => void;
  onSelectMessages?: () => void;
  onOpenMedia?: () => void;
  onOpenBills?: () => void;
  onClearChat?: () => void;
  profileDetails?: Array<{
    label: string;
    value?: string | null;
    href?: string;
    fields?: Array<{ label: string; value?: string | null; href?: string }>;
  }>;
  isGroup?: boolean;
  groupInfo?: {
    memberCount?: number;
    activeMemberCount?: number;
    members?: Array<{ userId?: string; userName?: string; role?: string; status?: string }>;
  } | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  peer,
  typingLabel,
  statusLabel,
  connected = true,
  onSearch,
  onBack,
  onSelectMessages,
  onOpenMedia,
  onOpenBills,
  onClearChat,
  profileDetails = [],
  isGroup,
  groupInfo,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setAvatarLoaded(false);
    setAvatarErrored(false);
  }, [peer?.avatar, peer?.id]);

  if (!peer) return null;
  const peerDisplayName = safeUserName(peer.name);
  const displayStatus = typingLabel || statusLabel || (connected ? "Live" : "Offline");
  const statusTone = typingLabel ? "text-emerald-200 bg-emerald-500/15 border-emerald-400/25" : peer.online ? "text-emerald-200 bg-emerald-500/15 border-emerald-400/25" : "text-slate-300 bg-slate-700/45 border-slate-600/60";

  const openMenu = () => {
    document.dispatchEvent(new Event("smartpopup:close-all" as any));
    const rect = menuBtnRef.current?.getBoundingClientRect();
    setMenuPoint(rect ? { x: rect.left - 210, y: rect.bottom + 8 } : null);
    setMenuOpen((value) => !value);
  };

  return (
    <motion.header
      key={isMobile ? `chat-header-mobile-${peer.id}` : "chat-header-desktop"}
      initial={isMobile ? { y: -14, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: isMobile ? 0.2 : 0.14, ease: [0.22, 0.61, 0.36, 1] }}
      style={{ willChange: "transform, opacity" }}
      className="border-b border-gray-800/90 bg-[#111c2a]/95 px-2 pb-2 pt-[max(0.58rem,env(safe-area-inset-top))] backdrop-blur md:px-3"
    >
      <div className="mx-auto flex min-h-[62px] w-full max-w-5xl items-center gap-2 rounded-2xl border border-slate-700/70 bg-[#1c2a3a]/95 px-2.5 shadow-[0_10px_26px_rgba(0,0,0,0.25)] md:min-h-[60px] md:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-300 transition-colors hover:bg-gray-700/60 hover:text-white md:hidden"
              title="Back to chats"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(new Event("smartpopup:close-all" as any));
              setMenuOpen(false);
              setInfoOpen(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-gray-700/35"
            title="View contact info"
          >
            <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-700/70 text-sm font-semibold text-white ring-1 ring-emerald-400/25">
              {safeInitial(peer.name)}
              {peer.avatar && !avatarErrored && (
                <img
                  src={peer.avatar}
                  className={`absolute inset-0 h-10 w-10 rounded-full object-cover transition-opacity duration-200 ${avatarLoaded ? "opacity-100" : "opacity-0"}`}
                  alt={peerDisplayName}
                  onLoad={() => setAvatarLoaded(true)}
                  onError={() => {
                    setAvatarLoaded(false);
                    setAvatarErrored(true);
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[1.06rem] font-semibold text-gray-100">{peerDisplayName}</div>
              <div className="pt-1">
                <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-none ${statusTone}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${typingLabel || peer.online ? "bg-emerald-300" : "bg-slate-400"}`} />
                  <span className="truncate">{displayStatus}</span>
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onOpenBills && (
            <button
              type="button"
              onClick={onOpenBills}
              className="grid h-10 w-10 place-items-center rounded-full text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-white"
              title="Customer bills"
            >
              <Receipt size={18} />
            </button>
          )}
          <button
            type="button"
            ref={menuBtnRef}
            onClick={openMenu}
            className="grid h-10 w-10 place-items-center rounded-full text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-white"
            title="More options"
          >
            <MoreVertical size={19} />
          </button>
        </div>
      </div>

      <ChatMenu
        peerId={peer.id}
        peerName={peerDisplayName}
        peerAvatar={peer.avatar}
        peerOnline={peer.online}
        peerLastSeen={peer.lastSeen}
        peerTyping={Boolean(typingLabel)}
        statusLabel={displayStatus}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorPoint={menuPoint}
        onStartSelection={onSelectMessages}
        onOpenMedia={onOpenMedia}
        onSearch={onSearch}
        onClearChat={onClearChat}
        isGroup={Boolean(isGroup)}
        groupInfo={groupInfo || null}
        detailItems={profileDetails}
      />
      <ChatMenu
        peerId={peer.id}
        peerName={peerDisplayName}
        peerAvatar={peer.avatar}
        peerOnline={peer.online}
        peerLastSeen={peer.lastSeen}
        peerTyping={Boolean(typingLabel)}
        statusLabel={displayStatus}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        variant="info"
        onStartSelection={onSelectMessages}
        onOpenMedia={onOpenMedia}
        onSearch={onSearch}
        onClearChat={onClearChat}
        isGroup={Boolean(isGroup)}
        groupInfo={groupInfo || null}
        detailItems={profileDetails}
      />
    </motion.header>
  );
};

export default ChatHeader;
