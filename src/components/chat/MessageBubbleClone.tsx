import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimation, useMotionValue } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import MessageContent from "@/components/chat/MessageContent";
import MessageStatus from "@/components/chat/MessageStatus";
import MediaPlayer from "@/components/chat/MediaPlayer";
import type { ChatMessage } from "@/lib/chat-api";

interface Props {
  message: ChatMessage;
  prev?: ChatMessage | null;
  next?: ChatMessage | null;
  onEdit?: (m: ChatMessage) => void;
  onReply?: (m: ChatMessage) => void;
  onCopy?: (m: ChatMessage) => void;
  isSelf: boolean;
}

const QUICK = ["??", "??", "??", "??", "??", "??"];

export default function MessageBubbleClone({ message, prev, next, onEdit, onReply, onCopy, isSelf }: Props) {
  const user = useAuthStore((s) => s.user as { id?: string; _id?: string; name?: string } | null);
  const reactMessage = useChatStore((s) => s.reactMessage);
  const me = String(user?._id || user?.id || "");
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const tapRef = useRef<{ c: number; t: any }>({ c: 0, t: null as any });

  const grouping = useMemo(() => {
    const sid = ((message.sender as any)?._id || (message.sender as any)?._ref || "") as string;
    const psid = prev ? (((prev.sender as any)?._id || (prev.sender as any)?._ref || "") as string) : "";
    const nsid = next ? (((next.sender as any)?._id || (next.sender as any)?._ref || "") as string) : "";
    const samePrev = !!prev && psid === sid;
    const sameNext = !!next && nsid === sid;
    return { samePrev, sameNext };
  }, [message, prev, next]);

  const shapeClasses = useMemo(() => {
    const mid = grouping.samePrev && grouping.sameNext;
    const first = !grouping.samePrev && grouping.sameNext;
    const last = grouping.samePrev && !grouping.sameNext;
    const solo = !grouping.samePrev && !grouping.sameNext;
    if (mid) return "rounded-tl-lg rounded-bl-lg rounded-tr-md rounded-br-md";
    if (solo) return "rounded-lg";
    if (isSelf) {
      if (first) return "rounded-tl-lg rounded-tr-lg rounded-br-md rounded-bl-lg";
      if (last) return "rounded-bl-lg rounded-br-lg rounded-tr-md rounded-tl-lg";
    } else {
      if (first) return "rounded-tr-lg rounded-tl-lg rounded-bl-md rounded-br-lg";
      if (last) return "rounded-br-lg rounded-bl-lg rounded-tl-md rounded-tr-lg";
    }
    return "rounded-md";
  }, [grouping, isSelf]);

  const content = String(message.content || "");
  const t = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const media = useMemo(() => {
    const first = (message.attachments || [])[0];
    if (!first) return null;
    const type = first.type?.startsWith("image/") ? "image" : first.type?.startsWith("video/") ? "video" : first.type?.startsWith("audio/") ? "audio" : "file";
    return { type: type as "image"|"video"|"audio"|"file", url: first.url };
  }, [message.attachments]);

  const onDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    const dx = info?.offset?.x || 0;
    const dy = info?.offset?.y || 0;
    const has = Math.abs(dx) >= 14 && Math.abs(dx) >= Math.abs(dy) * 1.25;
    if (has) {
      if (dx >= 14) onReply?.(message);
      else if (dx <= -14 && isSelf && !media) onEdit?.(message);
    }
    controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
  };

  const onTap = () => {
    tapRef.current.c += 1;
    if (tapRef.current.t) clearTimeout(tapRef.current.t);
    tapRef.current.t = setTimeout(() => (tapRef.current.c = 0), 450);
  };

  const reactions = message.reactions || [];

  return (
    <div className={`w-full flex ${isSelf ? "justify-end" : "justify-start"}`}>
      <motion.div
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
          setMenu({ open: true, x: e.clientX + 2, y: e.clientY + 2 });
        }}
        className={`group relative min-w-[3.5rem] px-2.5 pt-[5px] pb-[5px] ${grouping.samePrev ? "mt-px" : "mt-1"} ${grouping.sameNext ? "mb-px" : "mb-1"} ${reactions.length ? "!mb-[14px]" : ""} max-w-[min(66%,23rem)] text-[0.82rem] leading-[1.28] shadow-[0_6px_18px_rgba(2,8,23,0.24)] ring-1 ring-inset ${isSelf ? "bg-gradient-to-b from-slate-600/95 to-slate-700/95 text-slate-100 ring-slate-400/20" : "bg-gradient-to-b from-slate-700/95 to-slate-800/95 text-slate-100 ring-slate-500/25"} ${shapeClasses}`}
        drag="x"
        dragConstraints={{ left: -28, right: 28 }}
        dragElastic={0.12}
        dragMomentum={false}
        dragDirectionLock
        style={{ x }}
        animate={controls}
        whileTap={{ scale: 0.992 }}
        onDragEnd={onDragEnd}
        onTap={onTap}
        onDoubleClick={() => setOpen((v) => !v)}
      >
        {!grouping.sameNext && (
          <span className={`pointer-events-none absolute ${isSelf ? "-right-[5px] bg-slate-700/95" : "-left-[5px] bg-slate-800/95"} bottom-[9px] h-[9px] w-[6px]`} style={{ clipPath: isSelf ? "polygon(0 0, 100% 50%, 0 100%)" : "polygon(100% 0, 0 50%, 100% 100%)" }} />
        )}

        {media && <div className="mb-1"><MediaPlayer type={media.type} src={media.url} timeLabel={t} /></div>}
        {!media && <MessageContent content={content} />}
        <MessageStatus message={message} isCurrentUser={isSelf} time={t} />

        {open && (
          <div className={`mt-1 flex items-center gap-1 rounded-[10px] border border-[#4b5563] bg-[#0f172a] px-2 py-1.5 shadow-lg ${isSelf ? "justify-end" : "justify-start"}`}>
            {QUICK.slice(0,4).map((emoji) => (
              <button key={emoji} type="button" onClick={() => { if (me) void reactMessage(((message.room as any)?._ref || message.room) as string, message._id, emoji, me, user?.name || "User"); setOpen(false); }} className="rounded-md px-1.5 py-0.5 text-sm hover:bg-slate-800">{emoji}</button>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-600" />
            <button type="button" onClick={() => { onReply?.(message); setOpen(false); }} className="rounded-md p-1 text-slate-300 hover:bg-slate-800">?</button>
            {isSelf && <button type="button" onClick={() => { onEdit?.(message); setOpen(false); }} className="rounded-md p-1 text-slate-300 hover:bg-slate-800">?</button>}
            <button type="button" onClick={() => { onCopy?.(message); setOpen(false); }} className="rounded-md p-1 text-slate-300 hover:bg-slate-800">?</button>
          </div>
        )}

        {reactions.length > 0 && (
          <div className="absolute" style={{ bottom: -10, right: isSelf ? 6 : undefined, left: !isSelf ? 6 : undefined }}>
            <div className="flex cursor-pointer items-center gap-1 rounded-full bg-gray-800/90 px-2 py-0.5 text-[13px]" onClick={() => setOpen(true)}>
              <span className="flex items-center gap-1">{Array.from(new Set(reactions.map((r) => r.emoji))).slice(0, 3).map((emoji, i) => <span key={`${emoji}-${i}`}>{emoji}</span>)}</span>
              {reactions.length > 1 && <span className="ml-1 text-gray-200">{reactions.length}</span>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
