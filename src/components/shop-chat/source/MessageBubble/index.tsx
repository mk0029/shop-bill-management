import React, { useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
} from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { Message } from "@/lib/types";
import { toast } from "react-hot-toast";
import { ClipboardList, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import MediaPlayer from "./MediaPlayer";
import MessageContent from "./MessageContent";
import MessageStatus from "./MessageStatus";
import MessageReactions from "./reactionsPicker";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import SmartPopup from "@/lib/ui/SmartPopup";
import { decodeTransportText, mediaReplyLabel } from "@/lib/messageCodec";
import { safeUserName } from "@/lib/display-text";

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

interface MessageBubbleProps {
  message: Message;
  prev?: Message | null;
  next?: Message | null;
  onEdit?: (m: Message) => void;
  onDelete?: (m: Message) => void;
  onForward?: (m: Message) => void;
  onReply?: (m: Message) => void;
  onInfo?: (m: Message) => void;
  onSelect?: (m: Message) => void;
  isStarred?: boolean;
  onToggleStar?: (m: Message) => void;
  isSelected?: boolean;
  selectMode?: boolean;
  onOpenImage?: (payload: { src: string; messageId: string }) => void;
  onResend?: (m: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  prev,
  next,
  onEdit,
  onDelete,
  onForward,
  onReply,
  onInfo,
  onSelect,
  isStarred,
  onToggleStar,
  isSelected,
  selectMode,
  onOpenImage,
  onResend,
}) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user as any);
  const isCurrentUser =
    String(user?.id || user?._id || "") === String(message.senderId);
  const senderRole = String(message.senderRole || "");
  const isSupportSender =
    senderRole === "admin" ||
    senderRole === "super_admin" ||
    senderRole === "technician";
  const supportSenderName = safeUserName(
    message.senderName,
    senderRole === "technician" ? "Technician" : "Support",
  );
  const supportFirstName =
    supportSenderName.split(/\s+/)[0] || supportSenderName;
  const showSupportBadge =
    isSupportSender && !isCurrentUser && message.messageKind !== "system";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });

  // Determine grouping
  const grouping = useMemo(() => {
    const within = (a?: string, b?: string) => {
      if (!a || !b) return false;
      return (
        Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 2 * 60 * 1000
      );
    };
    const samePrev =
      prev &&
      prev.senderId === message.senderId &&
      within(prev.timestamp, message.timestamp);
    const sameNext =
      next &&
      next.senderId === message.senderId &&
      within(next.timestamp, message.timestamp);
    return { samePrev: !!samePrev, sameNext: !!sameNext };
  }, [prev, next, message.senderId, message.timestamp]);

  // Decode content for display
  const contentText = useMemo(() => {
    const decoded = decodeTransportText(decodeTransportText(message.content || ""));
    return roleSafeSystemText(decoded, String(user?.role || ""));
  }, [message.content, user?.role]);

  // Detect media and URLs
  const urlRe = /(https?:\/\/[^\s]+)/gi;
  const firstUrl = useMemo(() => {
    const m = contentText.match(urlRe);
    return m && m.length > 0 ? m[0] : null;
  }, [contentText]);

  const media = useMemo(() => {
    let t: "image" | "video" | "audio" | "file" | null = null;
    const url =
      firstUrl ||
      (contentText.startsWith("/api/media/") || contentText.startsWith("data:")
        ? contentText
        : null);
    if (!url) return null as any;

    const lower = url.toLowerCase();
    const extSource = (() => {
      try {
        const u = new URL(
          url,
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost",
        );
        const qf = u.searchParams.get("filename");
        return (qf || u.pathname).toLowerCase();
      } catch {
        return lower;
      }
    })();

    const dataMime = contentText.startsWith("data:")
      ? contentText
          .slice(
            5,
            contentText.indexOf(";") > 0
              ? contentText.indexOf(";")
              : contentText.indexOf(","),
          )
          .toLowerCase()
      : "";
    const byUrl = dataMime.startsWith("image/")
      ? "image"
      : dataMime.startsWith("audio/")
        ? "audio"
        : dataMime.startsWith("video/")
          ? "video"
          : dataMime
            ? "file"
            : extSource.match(
                  /\.(png|jpg|jpeg|gif|webp|avif|bmp|heic|heif)(\?|#|$)/,
                )
              ? "image"
              : extSource.match(
                    /\.(mp3|mpeg|mpga|m4a|aac|wav|ogg|oga|flac|opus|weba|wma|amr|aiff|aif|mka)(\?|#|$)/,
                  )
                ? "audio"
                : extSource.match(
                      /\.(mp4|mov|m4v|webm|avi|mkv|3gp|mpeg|mpg|wmv|flv|ts|m2ts|mts|ogv|vob|rm|rmvb)(\?|#|$)/,
                    )
                  ? "video"
                  : extSource.match(
                        /\.(pdf|zip|rar|7z|txt|csv|doc|docx|xls|xlsx|ppt|pptx|apk|dmg|exe|tar|gz|bz2|xz|iso)(\?|#|$)/,
                      )
                    ? "file"
                    : null;

    const byType = (message as any).type as string | undefined;
    if (byUrl === "audio" && byType === "video") {
      t = "audio";
    } else if (
      byType &&
      ["image", "video", "audio", "document"].includes(byType)
    ) {
      t = byType === "document" ? "file" : (byType as any);
    } else if (byUrl) {
      t = byUrl as any;
    }

    return t ? ({ type: t, url } as const) : null;
  }, [firstUrl, contentText, message]);

  // Shape classes for grouping
  const shapeClasses = useMemo(() => {
    const mid = grouping.samePrev && grouping.sameNext;
    const first = !grouping.samePrev && grouping.sameNext;
    const last = grouping.samePrev && !grouping.sameNext;
    const solo = !grouping.samePrev && !grouping.sameNext;

    if (mid) return "rounded-tl-lg rounded-bl-lg rounded-tr-md rounded-br-md";
    if (solo) return "rounded-lg";
    if (isCurrentUser) {
      if (first)
        return "rounded-tl-lg rounded-tr-lg rounded-br-md rounded-bl-lg";
      if (last)
        return "rounded-bl-lg rounded-br-lg rounded-tr-md rounded-tl-lg";
    } else {
      if (first)
        return "rounded-tr-lg rounded-tl-lg rounded-bl-md rounded-br-lg";
      if (last)
        return "rounded-br-lg rounded-bl-lg rounded-tl-md rounded-tr-lg";
    }
    return "rounded-md";
  }, [grouping.samePrev, grouping.sameNext, isCurrentUser]);

  // Swipe/drag setup
  const x = useMotionValue(0);
  const controls = useAnimation();
  const dragBounds = { left: -28, right: 28 } as const;
  const SWIPE_THRESHOLD = 14;
  const HORIZONTAL_INTENT_RATIO = 1.25;

  const onDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    const dx = info?.offset?.x || 0;
    const dy = info?.offset?.y || 0;
    const hasHorizontalIntent =
      Math.abs(dx) >= SWIPE_THRESHOLD &&
      Math.abs(dx) >= Math.abs(dy) * HORIZONTAL_INTENT_RATIO;

    if (!hasHorizontalIntent) {
      controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 500, damping: 30 },
      });
      return;
    }

    if (dx >= SWIPE_THRESHOLD) {
      onReply?.(message);
    } else if (dx <= -SWIPE_THRESHOLD) {
      const hasMedia = !!media;
      if (isCurrentUser && !hasMedia) onEdit?.(message);
    }
    controls.start({
      x: 0,
      transition: { type: "spring", stiffness: 500, damping: 30 },
    });
  };

  // Triple tap to delete
  const tapRef = useRef<{ c: number; t: any }>({ c: 0, t: null as any });
  const onTap = () => {
    tapRef.current.c += 1;
    if (tapRef.current.t) clearTimeout(tapRef.current.t);
    tapRef.current.t = setTimeout(() => {
      tapRef.current.c = 0;
    }, 450);
    if (tapRef.current.c >= 3) {
      tapRef.current.c = 0;
      if (onDelete) onDelete(message);
    }
  };

  // Context menu
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new Event("smartpopup:close-all" as any));
    setMenu({ open: true, x: e.clientX + 2, y: e.clientY + 2 });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contentText);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    setMenu((m) => ({ ...m, open: false }));
  };

  // Reply preview
  const handleScrollToOriginal = () => {
    const id = message.replyTo?.messageId;
    if (!id) return;
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-emerald-400/80", "rounded-xl");
    el.animate(
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(1.01)", opacity: 1 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 800, easing: "ease-out" },
    );
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-emerald-400/80", "rounded-xl");
    }, 1200);
  };

  const hasReactions = !!(message.reactions && message.reactions.length);
  const showTail = !grouping.sameNext;
  const mediaLabel = media
    ? media.type === "image"
      ? "Photo"
      : media.type === "video"
        ? "Video"
        : media.type === "audio"
          ? "Voice note"
          : "File"
    : null;
  const hasValidReply =
    !!message.replyTo &&
    !!String(message.replyTo.messageId || "").trim() &&
    String(message.replyTo.messageId || "").toLowerCase() !== "undefined" &&
    String(message.replyTo.messageId || "").toLowerCase() !== "null";
  const deletedText = String(message.content || "")
    .trim()
    .toLowerCase();
  const isDeletedForEveryone =
    !!message.deletedForEveryone || deletedText === "this message was deleted";
  const inferredBillId = String(message.tempId || "").startsWith(
    "event:bill_created:",
  )
    ? String(message.tempId || "").replace("event:bill_created:", "")
    : "";
  const inferredBillAmount = (() => {
    const match = contentText.match(/of\s*₹?\s*([\d,.]+)/i);
    if (!match?.[1]) return 0;
    return Number(match[1].replace(/,/g, "")) || 0;
  })();
  const billEventData =
    message.systemEventType === "bill_created" ||
    message.systemEventData?.eventType === "bill_created"
      ? message.systemEventData
      : inferredBillId || /bill is created|bill created/i.test(contentText)
        ? {
            eventType: "bill_created",
            billId: inferredBillId,
            totalAmount: inferredBillAmount,
          }
        : null;
  const workTaskEventData =
    message.systemEventType === "work_task" ||
    message.systemEventData?.eventType === "work_task"
      ? message.systemEventData
      : null;
  const isCustomerViewer = String(user?.role || "") === "customer";
  const billAmount = Number(billEventData?.totalAmount || 0);
  const billEventText = isCustomerViewer
    ? `Your bill${billAmount > 0 ? ` of ₹${billAmount.toLocaleString()}` : ""} has been created`
    : `Bill created${billAmount > 0 ? ` of ₹${billAmount.toLocaleString()}` : ""}`;
  const openBillEvent = () => {
    const rawBillId = String(billEventData?.billId || "").trim();
    if (String(user?.role || "") === "customer") {
      router.push(
        rawBillId
          ? `/customer/bills?open=${encodeURIComponent(rawBillId)}`
          : "/customer/bills",
      );
      return;
    }
    const customerId = encodeURIComponent(
      String(billEventData.customerId || ""),
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
  const workTaskTitle = String(
    workTaskEventData?.title || "Service task",
  ).trim();
  const workTaskAction = String(workTaskEventData?.action || "updated").replace(
    /_/g,
    " ",
  );
  const workTaskSystemText =
    isCustomerViewer && workTaskAction === "created"
      ? "Shop assigned new work"
      : isCustomerViewer && workTaskAction === "completed"
        ? "Shop completed your task"
        : isCustomerViewer
          ? "Shop updated your work"
          : workTaskAction === "created"
            ? "New work assigned"
            : workTaskAction === "completed"
              ? "Task completed"
              : "Work updated";
  const openWorkTaskEvent = () => {
    if (!workTaskEventData?.taskId) return;
    const taskId = encodeURIComponent(String(workTaskEventData.taskId));
    if (String(user?.role || "") === "customer") {
      router.push(`/customer/work-tasks?open=${taskId}`);
      return;
    }
    router.push(`/dashboard/work-list?open=${taskId}`);
  };

  return (
    <div
      className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      <motion.div
        onContextMenu={onContextMenu}
        className={`group relative min-w-[3.5rem] px-2.5 pt-[5px] pb-[5px] ${grouping.samePrev ? "mt-px" : "mt-1"} ${grouping.sameNext ? "mb-px" : "mb-1"} ${hasReactions ? "!mb-[14px]" : ""} max-w-[min(66%,23rem)] text-[0.82rem] leading-[1.28] shadow-[0_6px_18px_rgba(2,8,23,0.24)] ring-1 ring-inset transition-all duration-200
        ${isCurrentUser ? "bg-gradient-to-b from-slate-600/95 to-slate-700/95 text-slate-100 ring-slate-400/20" : "bg-gradient-to-b from-slate-700/95 to-slate-800/95 text-slate-100 ring-slate-500/25"}
        ${isDeletedForEveryone ? "overflow-hidden" : ""}
        ${shapeClasses}
        ${isSelected ? "ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-gray-900" : ""}
        ${isSelected ? (isCurrentUser ? "bg-gray-700/90" : "bg-gray-800/90") : ""}
        ${!isSelected ? "hover:-translate-y-[1px] hover:shadow-[0_10px_28px_rgba(2,8,23,0.36)]" : ""}
        `}
        drag="x"
        dragConstraints={dragBounds}
        dragElastic={0.12}
        dragMomentum={false}
        dragDirectionLock
        style={{ x }}
        animate={controls}
        whileTap={{ scale: 0.992 }}
        onDragEnd={onDragEnd}
        onTap={onTap}
        onClick={(e) => {
          if (selectMode) {
            e.preventDefault();
            e.stopPropagation();
            onSelect?.(message);
          }
        }}
      >
        {showSupportBadge && (
          <div className="mb-1 -mt-0.5 flex items-end -mr-1 font-medium capitalize tracking-wide text-slate-300">
            {/* <span className="max-w-[7rem] truncate normal-case tracking-normal text-slate-200"></span> */}
            <span className="rounded-full border border-sky-300/30 bg-sky-400/12 px-1.5 py-0.5 text-[9px] leading-none text-sky-100">
              {supportFirstName}
            </span>
          </div>
        )}
        <AnimatePresence>
          {isDeletedForEveryone && message.wipePulseAt && (
            <motion.div
              key={`wipe-${message.id}-${message.wipePulseAt}`}
              initial={{ x: "-130%", opacity: 0 }}
              animate={{ x: "130%", opacity: [0, 0.65, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.62, ease: "easeOut" }}
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/2 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent"
            />
          )}
        </AnimatePresence>

        {showTail && (
          <>
            {isCurrentUser ? (
              <span
                className="pointer-events-none absolute -right-[5px] bottom-[9px] h-[9px] w-[6px] bg-slate-700/95"
                style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
              />
            ) : (
              <span
                className="pointer-events-none absolute -left-[5px] bottom-[9px] h-[9px] w-[6px] bg-slate-800/95"
                style={{ clipPath: "polygon(100% 0, 0 50%, 100% 100%)" }}
              />
            )}
          </>
        )}

        {/* Hover reactions bar */}
        <div className="hidden" style={{ backdropFilter: "blur(6px)" }}>
          {["❤️", "😂", "👍", "😮", "😢", "😡"].map((r) => (
            <button
              key={r}
              type="button"
              className="hover:scale-110 transition-transform"
              aria-label={`React ${r}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Bill/system event card */}
        {billEventData && !isDeletedForEveryone && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openBillEvent();
            }}
            className="mb-1 block w-full rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-left transition hover:border-emerald-300/60 hover:bg-emerald-500/15"
          >
            <div className="mb-2 flex items-center gap-2 text-emerald-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/20 text-emerald-200">
                <Receipt size={16} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  Bill Created
                </div>
                <div className="truncate text-[11px] text-emerald-100/70">
                  {String(
                    billEventData.billNumber || billEventData.billId || "Bill",
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-100">
              {billEventText}.
            </div>
            <div className="mt-1 text-xs font-medium text-emerald-200">
              For more detail click here
            </div>
          </button>
        )}

        {/* Work task/system event card */}
        {workTaskEventData && !isDeletedForEveryone && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openWorkTaskEvent();
            }}
            className="mb-1 block w-full rounded-xl border border-sky-400/35 bg-sky-500/10 p-3 text-left transition hover:border-sky-300/60 hover:bg-sky-500/15"
          >
            <div className="mb-2 flex items-center gap-2 text-sky-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-500/20 text-sky-200">
                <ClipboardList size={16} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {workTaskSystemText}
                </div>
                <div className="truncate text-[11px] capitalize text-sky-100/70">
                  {workTaskAction}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-100">
              {workTaskTitle}
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-slate-200/85">
              {workTaskEventData.status ? (
                <div>
                  Status: {String(workTaskEventData.status).replace(/-/g, " ")}
                </div>
              ) : null}
              {workTaskEventData.dueAt ? (
                <div>
                  Due:{" "}
                  {Number.isNaN(
                    new Date(String(workTaskEventData.dueAt)).getTime(),
                  )
                    ? String(workTaskEventData.dueAt)
                    : new Date(String(workTaskEventData.dueAt)).toLocaleString(
                        [],
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                        },
                      )}
                </div>
              ) : null}
              {workTaskEventData.assignedTechnicianName ? (
                <div>
                  Technician:{" "}
                  {safeUserName(
                    workTaskEventData.assignedTechnicianName,
                    "Technician",
                  )}
                </div>
              ) : null}
            </div>
            <div className="mt-1 text-xs font-medium text-sky-200">
              For more detail click here
            </div>
          </button>
        )}

        {/* Forward indicator */}
        {message.forwarded && !isDeletedForEveryone && (
          <div className="mb-1 inline-flex items-center rounded-full border border-slate-500/35 bg-slate-800/55 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-300">
            Forwarded
          </div>
        )}

        {/* Reply preview */}
        {hasValidReply && !isDeletedForEveryone && (
          <button
            type="button"
            onClick={handleScrollToOriginal}
            className="mb-1 rounded-lg border border-slate-500/35 bg-slate-900/40 px-2.5 py-1.5 text-left text-[11px] hover:bg-slate-800/60 transition-colors"
          >
            {(() => {
              const meId = String(user?.id || user?._id || "");
              const replySenderId = String(message.replyTo?.senderId || "");
              const msgSenderId = String(message.senderId);
              const replyingToSelf =
                replySenderId && replySenderId === msgSenderId;
              let who = safeUserName(
                message.replyTo?.senderName || replySenderId,
              );
              if (replySenderId) {
                if (replySenderId === meId) {
                  who = isCurrentUser ? "yourself" : "you";
                } else if (replyingToSelf) {
                  who = isCurrentUser ? "yourself" : "himself";
                }
              }
              return <div className="text-slate-300/95">Replying to {who}</div>;
            })()}
            <div className="truncate text-slate-300/75">
              {mediaReplyLabel(String(message.replyTo?.text || "")) ||
                message.replyTo?.messageId ||
                ""}
            </div>
          </button>
        )}

        {/* Media preview */}
        {media && !isDeletedForEveryone && (
          <div className="mb-1">
            <MediaPlayer
              type={media.type}
              src={media.url}
              timeLabel={time}
              uploading={(message as any).uploading}
              uploadProgress={(message as any).uploadProgress}
              onOpenImage={
                media.type === "image"
                  ? (src) =>
                      onOpenImage?.({ src, messageId: String(message.id) })
                  : undefined
              }
            />
          </div>
        )}

        {/* Text content (hide if media detected) */}
        {isDeletedForEveryone ? (
          <div className="flex items-center gap-2 py-0.5 text-xs italic text-slate-200/95">
            <span className="h-px flex-1 bg-slate-400/45" />
            <span>This message was deleted</span>
            <span className="h-px flex-1 bg-slate-400/45" />
          </div>
        ) : (
          !media &&
          !billEventData &&
          !workTaskEventData && <MessageContent content={contentText} />
        )}

        {/* Link preview */}
        {firstUrl && !media && !isDeletedForEveryone && (
          <LinkPreviewCard url={firstUrl} />
        )}

        {/* Status and timestamp */}
        <MessageStatus
          message={message}
          isCurrentUser={isCurrentUser}
          time={time}
          onResend={
            isCurrentUser &&
            message.status === "failed" &&
            String(message.id || "").startsWith("temp-")
              ? () => onResend?.(message)
              : undefined
          }
        />

        {/* Reactions */}
        {!isDeletedForEveryone && (
          <MessageReactions
            message={message}
            isCurrentUser={isCurrentUser}
            contentText={contentText}
            mediaLabel={mediaLabel}
          />
        )}
      </motion.div>

      {/* Context menu */}
      <SmartPopup
        open={menu.open}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        anchorPoint={{ x: menu.x, y: menu.y }}
        preferred={isCurrentUser ? "left" : "right"}
        margin={8}
        padding={10}
        className="w-40"
      >
        <div className="py-1 text-sm" onClick={(e) => e.stopPropagation()}>
          {!isDeletedForEveryone && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800"
              onClick={handleCopy}
            >
              Copy
            </button>
          )}
          {!isDeletedForEveryone && onReply && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800"
              onClick={() => {
                onReply(message);
                setMenu((m) => ({ ...m, open: false }));
              }}
            >
              Reply
            </button>
          )}
          {!isDeletedForEveryone && onEdit && isCurrentUser && !media && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800"
              onClick={() => {
                onEdit(message);
                setMenu((m) => ({ ...m, open: false }));
              }}
            >
              Edit
            </button>
          )}
          {!isDeletedForEveryone && onForward && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800"
              onClick={() => {
                onForward(message);
                setMenu((m) => ({ ...m, open: false }));
              }}
            >
              Forward
            </button>
          )}
          {onSelect && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800"
              onClick={() => {
                onSelect(message);
                setMenu((m) => ({ ...m, open: false }));
              }}
            >
              Select
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-800 text-rose-300"
              onClick={() => {
                onDelete(message);
                setMenu((m) => ({ ...m, open: false }));
              }}
            >
              {isCurrentUser ? "Wipe" : "Delete for me"}
            </button>
          )}
        </div>
      </SmartPopup>
    </div>
  );
};

export default MessageBubble;
