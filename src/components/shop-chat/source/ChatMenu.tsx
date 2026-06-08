import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, ImageIcon, Info, Save, Search, Share2, Trash2, X } from "lucide-react";
import { safeInitial, safeUserName } from "@/lib/display-text";
import Portal from "@/lib/ui/Portal";
import SmartPopup from "@/lib/ui/SmartPopup";

type DetailItem = {
  label: string;
  value?: string | null;
  href?: string;
  fields?: Array<{ label: string; value?: string | null; href?: string }>;
  tone?: "admin" | "technician";
};

interface ChatMenuProps {
  peerId: string;
  peerName?: string;
  peerAvatar?: string;
  peerOnline?: boolean;
  peerLastSeen?: string;
  peerTyping?: boolean;
  open: boolean;
  onClose: () => void;
  anchorPoint?: { x: number; y: number } | null;
  onStartSelection?: () => void;
  onOpenMedia?: () => void;
  onSearch?: () => void;
  onClearChat?: () => void;
  variant?: "menu" | "info";
  isGroup?: boolean;
  groupInfo?: {
    memberCount?: number;
    activeMemberCount?: number;
    members?: Array<{ userId?: string; userName?: string; role?: string; status?: string }>;
  } | null;
  detailItems?: DetailItem[];
  statusLabel?: string;
}

function statusText(input: {
  peerOnline?: boolean;
  peerTyping?: boolean;
  peerLastSeen?: string;
  statusLabel?: string;
}) {
  if (input.peerTyping) return "typing...";
  if (input.statusLabel) return input.statusLabel;
  if (input.peerOnline) return "Online";
  if (input.peerLastSeen) return `Last seen ${new Date(input.peerLastSeen).toLocaleString()}`;
  return "Offline";
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const ChatMenu: React.FC<ChatMenuProps> = ({
  peerId,
  peerName,
  peerAvatar,
  peerOnline,
  peerLastSeen,
  peerTyping,
  open,
  onClose,
  anchorPoint,
  onStartSelection,
  onOpenMedia,
  onSearch,
  onClearChat,
  variant = "menu",
  isGroup,
  groupInfo,
  detailItems = [],
  statusLabel,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);
  const status = statusText({ peerOnline, peerTyping, peerLastSeen, statusLabel });
  const members = groupInfo?.members || [];
  const displayPeerName = safeUserName(peerName, isGroup ? "Group" : "User");
  const closeInfo = () => {
    setDetailsOpen(false);
    onClose();
  };
  const computedDetails = useMemo(() => {
    const base = detailItems.length ? detailItems : [{ label: isGroup ? "Room ID" : "Participant", value: peerId }];
    if (!isGroup) return base;
    return [
      ...base,
      { label: "Members", value: String(groupInfo?.memberCount || members.length || 0) },
      { label: "Active Members", value: String(groupInfo?.activeMemberCount || members.filter((m) => String(m.status || "active") === "active").length || 0) },
    ];
  }, [detailItems, groupInfo?.activeMemberCount, groupInfo?.memberCount, isGroup, members, peerId]);

  const saveChatText = () => {
    const detailsText = computedDetails
      .map((item) => {
        const fields = item.fields?.length
          ? `\n${item.fields.map((field) => `  ${field.label}: ${field.value || "-"}`).join("\n")}`
          : "";
        return `${item.label}: ${item.value || "-"}${fields}`;
      })
      .join("\n");
    downloadText(`${displayPeerName}-details.txt`, `${displayPeerName || peerId}\n${status}\n\n${detailsText}`);
    onClose();
  };

  const shareChat = async () => {
    const text = `${displayPeerName || peerId}\n${status}`;
    try {
      if (navigator.share) await navigator.share({ title: displayPeerName || "Chat", text });
      else await navigator.clipboard.writeText(text);
    } catch {}
    onClose();
  };

  const infoPanel = (
    <Portal>
      <motion.div
        className="fixed inset-0 z-[3000] bg-black/45"
        onClick={closeInfo}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="fixed inset-0 z-[3001] flex items-end justify-center p-2 sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex max-h-[78dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl sm:max-h-[72dvh]"
          initial={{ y: 24, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 24, scale: 0.98 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative shrink-0 border-b border-gray-700 px-4 py-4">
            <button
              type="button"
              onClick={closeInfo}
              className="absolute right-3 top-3 rounded p-1.5 text-gray-300 hover:bg-gray-800 hover:text-white"
              title="Close details"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-emerald-700/60 text-xl font-semibold text-white ring-2 ring-emerald-500/40">
                {safeInitial(peerName)}
                {peerAvatar && !avatarErrored && (
                  <img
                    src={peerAvatar}
                    alt={displayPeerName}
                    className="absolute inset-0 h-16 w-16 rounded-full object-cover"
                    onError={() => setAvatarErrored(true)}
                  />
                )}
              </div>
              <div className="max-w-full truncate text-lg font-semibold">{displayPeerName}</div>
              <div className="max-w-full truncate text-xs text-gray-300">{status}</div>
            {isGroup && (
              <div className="max-w-[90%] truncate text-[11px] text-gray-300">
                  {members.map((member) => safeUserName(member.userName || member.userId, "Member")).filter(Boolean).join(", ") || "Members list unavailable"}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
              {computedDetails.map((item) => {
                const isSupportCard = item.tone === "admin" || item.tone === "technician";
                const cardClass =
                  item.tone === "technician"
                    ? "border-amber-400/45 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
                    : item.tone === "admin"
                      ? "border-cyan-400/45 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                      : "border-gray-700/80 bg-gray-950/55";
                return (
                <div key={item.label} className={`rounded-xl border px-3 py-2.5 text-left ${cardClass}`}>
                  <div className={`text-[10px] uppercase tracking-wide ${isSupportCard ? "text-gray-300" : "text-gray-500"}`}>{item.label}</div>
                  {isSupportCard && item.value && (
                    <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      item.tone === "technician" ? "bg-amber-400/20 text-amber-100" : "bg-cyan-400/20 text-cyan-100"
                    }`}>
                      {item.value}
                    </div>
                  )}
                  {item.fields?.length ? (
                    <div className="mt-1.5 space-y-1.5">
                      {item.fields.map((field) => (
                        <div key={field.label} className="text-sm">
                          <span className="mr-2 text-xs uppercase tracking-wide text-gray-500">{field.label}</span>
                          {field.href ? (
                            <a href={field.href} className="break-all text-cyan-200 hover:text-cyan-100 hover:underline">
                              {field.value || "Open"}
                            </a>
                          ) : (
                            <span className="break-words text-gray-100">{field.value || "—"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : item.href ? (
                    <a href={item.href} className="mt-1 block break-all text-sm text-cyan-200 hover:text-cyan-100 hover:underline">
                      {item.value || "Open"}
                    </a>
                  ) : (
                    <div className="mt-1 break-words text-sm text-gray-100">{item.value || "—"}</div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </Portal>
  );

  return (
    <AnimatePresence>
      {open && variant === "menu" && (
        <SmartPopup open={open} onClose={onClose} anchorPoint={anchorPoint || undefined} className="z-[3001] w-56 !border-gray-700 !bg-gray-900 !p-0">
          <div className="overflow-hidden rounded-md border border-gray-700 bg-gray-900 text-gray-100 shadow-xl">
            <ul className="py-1 text-sm">
              {onStartSelection && (
                <li>
                  <button
                    onClick={() => {
                      onClose();
                      onStartSelection();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800"
                  >
                    <CheckSquare size={16} /> Select Messages
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    onClose();
                    onSearch?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800"
                >
                  <Search size={16} /> Search Messages
                </button>
              </li>
              {onOpenMedia && (
                <li>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMedia();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800"
                  >
                    <ImageIcon size={16} /> Room Media
                  </button>
                </li>
              )}
              <li>
                <button onClick={saveChatText} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800">
                  <Save size={16} /> Save Chat as Text
                </button>
              </li>
              <li>
                <button onClick={shareChat} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800">
                  <Share2 size={16} /> Share Chat
                </button>
              </li>
              {onClearChat && (
                <li>
                  <button onClick={onClearChat} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800">
                    <Trash2 size={16} /> Clear Chat
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    onClose();
                    setDetailsOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-800"
                >
                  <Info size={16} /> {isGroup ? "Group Details / Report" : "View Details / Report"}
                </button>
              </li>
            </ul>
          </div>
        </SmartPopup>
      )}
      {open && variant === "info" && infoPanel}
      {detailsOpen && infoPanel}
    </AnimatePresence>
  );
};

export default ChatMenu;
