import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Message } from "@/lib/types";
import MessageStatus from "./MessageStatus";
import { safeUserName } from "@/lib/display-text";
import { markMediaLoaded, isMediaLoaded } from "@/lib/loaded-media-cache";
import { getCachedMediaBlob } from "@/lib/chat-cache";

interface MediaCollageBubbleProps {
  messages: Message[];
  isCurrentUser: boolean;
  onOpenImage?: (payload: { src: string; messageId: string }) => void;
}

function aspectRatioStyle(msg: Message): React.CSSProperties {
  const w = msg.media?.width;
  const h = msg.media?.height;
  if (w && h) return { aspectRatio: `${w} / ${h}` };
  if (msg.type === "video") return { aspectRatio: "16 / 9" };
  return { aspectRatio: "1 / 1" };
}

const MediaCell: React.FC<{
  message: Message;
  className: string;
  style?: React.CSSProperties;
  onOpen: () => void;
  extraOverlay?: string;
}> = ({ message, className, style, onOpen, extraOverlay }) => {
  const src = message.media?.url || message.content || "";
  const isVideo = String(message.type || "").toLowerCase() === "video";
  const [visible, setVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(!!src && isMediaLoaded(src));
  const ref = useRef<HTMLButtonElement | null>(null);
  const uploading = message.uploading;
  const uploadProgress = message.uploadProgress;
  const isFailed = !uploading && message.status === "failed";
  const [cacheSrc, setCacheSrc] = useState("");
  const cacheBlobUrlRef = useRef("");

  useEffect(() => {
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) { setCacheSrc(src); return; }
    let cancelled = false;
    (async () => {
      const cached = await getCachedMediaBlob(src);
      if (cancelled) return;
      if (cached) {
        const blobUrl = URL.createObjectURL(new Blob([cached.data], { type: cached.mimeType }));
        cacheBlobUrlRef.current = blobUrl;
        setCacheSrc(blobUrl);
      } else {
        setCacheSrc(src);
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    return () => {
      if (cacheBlobUrlRef.current) { URL.revokeObjectURL(cacheBlobUrlRef.current); cacheBlobUrlRef.current = ""; }
    };
  }, []);

  useEffect(() => {
    if (imgLoaded || !src) { setVisible(true); return; }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [src, imgLoaded]);

  const onLoad = useCallback(() => {
    setImgLoaded(true);
    if (src) markMediaLoaded(src);
  }, [src]);

  const cellStyle: React.CSSProperties = {
    ...(style || {}),
    ...(imgLoaded ? {} : aspectRatioStyle(message)),
  };

  if (!src && !uploading) return null;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      style={cellStyle}
      className={`relative overflow-hidden rounded-lg border border-gray-700 bg-black ${className}`}
    >
      {!imgLoaded && !isFailed && (
        <div className="absolute inset-0 animate-pulse bg-slate-700/40 rounded-lg" />
      )}
      {visible && cacheSrc && (
        isVideo ? (
          <video src={cacheSrc} muted playsInline className="absolute inset-0 h-full w-full object-cover" onLoadedData={onLoad} />
        ) : (
          <img
            src={cacheSrc}
            alt="media"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={onLoad}
            onError={onLoad}
          />
        )
      )}
      {isVideo && (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="h-8 w-8 rounded-full bg-black/60 text-white grid place-items-center text-sm">▶</div>
        </div>
      )}
      {extraOverlay && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-white text-lg font-semibold">
          {extraOverlay}
        </div>
      )}
      {uploading && (
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/60 z-10">
          {typeof uploadProgress === "number" ? (
            <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }} />
          ) : (
            <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
          )}
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <span className="text-xs text-red-300">Failed</span>
        </div>
      )}
    </button>
  );
};

const MemoizedMediaCell = React.memo(MediaCell);

const MediaCollageBubble: React.FC<MediaCollageBubbleProps> = ({
  messages,
  isCurrentUser,
  onOpenImage,
}) => {
  const count = messages.length;
  const lastMessage = messages[count - 1];
  const visible = useMemo(() => messages.slice(0, 4), [messages]);
  const remaining = count - visible.length;
  const time = new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const senderRole = String(lastMessage.senderRole || messages[0]?.senderRole || "");
  const isSupportSender = senderRole === "admin" || senderRole === "super_admin" || senderRole === "technician";
  const supportSenderName = safeUserName(lastMessage.senderName || messages[0]?.senderName, senderRole === "technician" ? "Technician" : "Support");
  const supportFirstName = supportSenderName.split(/\s+/)[0] || supportSenderName;

  // Fixed collage layouts
  const gridConfig = useMemo(() => {
    const n = visible.length;
    if (n === 1) {
      // Single image: wide fixed area
      return {
        className: "grid-cols-2 grid-rows-1",
        cells: [
          { className: "col-span-2 row-span-1", style: { aspectRatio: "16 / 9", maxHeight: "300px" } as React.CSSProperties },
        ],
      };
    }
    if (n === 2) {
      return {
        className: "grid-cols-2 grid-rows-1",
        cells: [
          { className: "col-span-1 row-span-1", style: { aspectRatio: "1 / 1" } as React.CSSProperties },
          { className: "col-span-1 row-span-1", style: { aspectRatio: "1 / 1" } as React.CSSProperties },
        ],
      };
    }
    if (n === 3) {
      return {
        className: "grid-cols-2 grid-rows-2",
        cells: [
          { className: "col-span-1 row-span-2", style: { aspectRatio: "4 / 5" } as React.CSSProperties },
          { className: "col-span-1 row-span-1", style: { aspectRatio: "1 / 1" } as React.CSSProperties },
          { className: "col-span-1 row-span-1", style: { aspectRatio: "1 / 1" } as React.CSSProperties },
        ],
      };
    }
    // 4+ images: 2x2 grid
    return {
      className: "grid-cols-2 grid-rows-2",
      cells: Array.from({ length: n }, () => ({
        className: "col-span-1 row-span-1",
        style: { aspectRatio: "1 / 1" } as React.CSSProperties,
      })),
    };
  }, [visible.length]);

  return (
    <>
      <div className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
        <div className={`group relative max-w-[260px] rounded-2xl p-2 shadow-sm ${
          isCurrentUser ? "bg-gray-700 text-gray-100" : "bg-gray-800 text-gray-100"
        }`}>
          {isSupportSender && !isCurrentUser && (
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
              <span className="max-w-[7rem] truncate normal-case tracking-normal text-slate-200">{supportFirstName}</span>
              <span className="rounded-full border border-sky-300/30 bg-sky-400/12 px-1.5 py-0.5 text-[9px] leading-none text-sky-100">Support</span>
            </div>
          )}
          <div className={`grid gap-1.5 ${gridConfig.className}`}>
            {visible.map((message, idx) => (
              <MemoizedMediaCell
                key={message.id}
                message={message}
                className={gridConfig.cells[idx]?.className || "col-span-1 row-span-1"}
                style={gridConfig.cells[idx]?.style}
                onOpen={() =>
                  onOpenImage?.({
                    src: String(message.media?.url || message.content || ""),
                    messageId: String(message.id),
                  })
                }
                extraOverlay={remaining > 0 && idx === 3 ? `+${remaining}` : undefined}
              />
            ))}
          </div>
          <MessageStatus message={lastMessage} isCurrentUser={isCurrentUser} time={time} />
        </div>
      </div>
    </>
  );
};

export default React.memo(MediaCollageBubble);