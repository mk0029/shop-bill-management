import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Loader2 } from "lucide-react";
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

// ─── helpers ────────────────────────────────────────────────────────────────

function getSrc(msg: Message): string {
  return String(msg.media?.url || msg.content || "");
}

function isVideo(msg: Message): boolean {
  return String(msg.type || "").toLowerCase() === "video";
}

// ─── single media cell ───────────────────────────────────────────────────────

interface CellProps {
  message: Message;
  /** Tailwind / utility classes forwarded to the wrapper button */
  className?: string;
  style?: React.CSSProperties;
  onOpen: () => void;
  /** Text rendered as a dark overlay (e.g. "+3") */
  overlay?: string;
  fitMode?: "cover" | "contain";
}

const MediaCell: React.FC<CellProps> = ({
  message,
  className = "",
  style,
  onOpen,
  overlay,
  fitMode = "cover",
}) => {
  const src = getSrc(message);
  const video = isVideo(message);

  const [visible, setVisible] = useState(!!src && isMediaLoaded(src));
  const [loaded, setLoaded] = useState(!!src && isMediaLoaded(src));
  const [cacheSrc, setCacheSrc] = useState("");
  const cacheBlobRef = useRef("");
  const btnRef = useRef<HTMLButtonElement>(null);

  const uploading = message.uploading;
  const uploadProgress = message.uploadProgress;
  const isFailed = !uploading && message.status === "failed";

  // resolve blob cache
  useEffect(() => {
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
      setCacheSrc(src);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = await getCachedMediaBlob(src);
      if (cancelled) return;
      if (cached) {
        const url = URL.createObjectURL(
          new Blob([cached.data], { type: cached.mimeType }),
        );
        cacheBlobRef.current = url;
        setCacheSrc(url);
      } else {
        setCacheSrc(src);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // revoke on unmount
  useEffect(
    () => () => {
      if (cacheBlobRef.current) URL.revokeObjectURL(cacheBlobRef.current);
    },
    [],
  );

  // lazy reveal via IntersectionObserver
  useEffect(() => {
    if (loaded || !src) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (btnRef.current) io.observe(btnRef.current);
    return () => io.disconnect();
  }, [src, loaded]);

  const onLoad = useCallback(() => {
    setLoaded(true);
    if (src) markMediaLoaded(src);
  }, [src]);

  if (!src && !uploading) return null;

  const fitClass = fitMode === "contain" ? "object-contain" : "object-cover";

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onOpen}
      style={style}
      className={`relative overflow-hidden bg-black ${className}`}
    >
      {/* skeleton / spinner */}
      {!loaded && !isFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
          {video ? (
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-slate-700/40" />
          )}
        </div>
      )}

      {/* media */}
      {visible &&
        cacheSrc &&
        (video ? (
          <video
            src={cacheSrc}
            muted
            playsInline
            className={`absolute inset-0 h-full w-full ${fitClass}`}
            onLoadedData={onLoad}
          />
        ) : (
          <img
            src={cacheSrc}
            alt="media"
            className={`absolute inset-0 h-full w-full ${fitClass}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={onLoad}
            onError={onLoad}
          />
        ))}

      {/* video play icon */}
      {video && (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm text-white">
            ▶
          </div>
        </div>
      )}

      {/* "+N" overlay */}
      {overlay && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white">
          {overlay}
        </div>
      )}

      {/* upload progress bar */}
      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-black/60">
          {typeof uploadProgress === "number" ? (
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
              }}
            />
          ) : (
            <div className="h-full w-1/2 animate-pulse bg-emerald-500" />
          )}
        </div>
      )}

      {/* failed state */}
      {isFailed && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <span className="text-xs text-red-300">Failed</span>
        </div>
      )}
    </button>
  );
};

const MemoizedCell = React.memo(MediaCell);

// ─── layout engine ───────────────────────────────────────────────────────────
//
// WhatsApp-style rules:
//   1  →  natural aspect ratio, contain fit, max-height capped
//   2  →  side-by-side squares
//   3  →  one tall left + two stacked right
//   4  →  2 × 2 grid
//   5  →  one wide banner across top + 2 × 2 grid below
//  6+  →  show first 5, overlay "+N" on the 5th cell
//

const CELL_SIZE = 140; // px – square cell edge for multi-image layouts

type CellLayout = {
  /** Grid placement class or style */
  gridColumn?: string;
  gridRow?: string;
  aspectRatio?: string;
  height?: number | string;
  width?: number | string;
  fitMode?: "cover" | "contain";
};

interface CollageLayout {
  /** Inline style for the wrapping grid container */
  containerStyle: React.CSSProperties;
  /** One entry per *visible* cell */
  cells: CellLayout[];
}

function buildLayout(msgs: Message[]): {
  layout: CollageLayout;
  visible: Message[];
  remaining: number;
} {
  const total = msgs.length;

  // cap visible cells
  const maxVisible = total <= 4 ? total : 5;
  const visible = msgs.slice(0, maxVisible);
  const remaining = total - maxVisible;

  const S = CELL_SIZE; // square size in px

  if (total === 1) {
    const msg = msgs[0];
    const w = msg.media?.width;
    const h = msg.media?.height;
    const ratio = w && h ? `${w} / ${h}` : "4 / 3";
    return {
      visible,
      remaining: 0,
      layout: {
        containerStyle: { display: "grid" },
        cells: [
          {
            aspectRatio: ratio,
            height: "min(60vh, 360px)",
            fitMode: "contain",
          },
        ],
      },
    };
  }

  if (total === 2) {
    return {
      visible,
      remaining: 0,
      layout: {
        containerStyle: {
          display: "grid",
          gridTemplateColumns: `${S}px ${S}px`,
          gridTemplateRows: `${S}px`,
          gap: 2,
        },
        cells: [{ aspectRatio: "1/1" }, { aspectRatio: "1/1" }],
      },
    };
  }

  if (total === 3) {
    // Left cell spans 2 rows; right two are stacked
    const half = Math.floor(S / 2) - 1; // (S-2)/2 to account for 2px gap
    return {
      visible,
      remaining: 0,
      layout: {
        containerStyle: {
          display: "grid",
          gridTemplateColumns: `${S}px ${S}px`,
          gridTemplateRows: `${half}px ${half}px`,
          gap: 2,
        },
        cells: [
          { gridColumn: "1", gridRow: "1 / 3" },
          { gridColumn: "2", gridRow: "1" },
          { gridColumn: "2", gridRow: "2" },
        ],
      },
    };
  }

  if (total === 4) {
    return {
      visible,
      remaining: 0,
      layout: {
        containerStyle: {
          display: "grid",
          gridTemplateColumns: `${S}px ${S}px`,
          gridTemplateRows: `${S}px ${S}px`,
          gap: 2,
        },
        cells: [
          { aspectRatio: "1/1" },
          { aspectRatio: "1/1" },
          { aspectRatio: "1/1" },
          { aspectRatio: "1/1" },
        ],
      },
    };
  }

  // 5+ images: wide banner (2 cols) + 2×2 below; show 5, overlay "+N" on last
  const bannerH = Math.round(S * 0.85);
  const thumbH = Math.round(S * 0.7);
  return {
    visible,
    remaining,
    layout: {
      containerStyle: {
        display: "grid",
        gridTemplateColumns: `${S}px ${S}px`,
        gridTemplateRows: `${bannerH}px ${thumbH}px ${thumbH}px`,
        gap: 2,
      },
      cells: [
        { gridColumn: "1 / 3", gridRow: "1" }, // banner
        { gridColumn: "1", gridRow: "2" },
        { gridColumn: "2", gridRow: "2" },
        { gridColumn: "1", gridRow: "3" },
        { gridColumn: "2", gridRow: "3" }, // gets "+N" overlay
      ],
    },
  };
}

// ─── bubble ──────────────────────────────────────────────────────────────────

const MediaCollageBubble: React.FC<MediaCollageBubbleProps> = ({
  messages,
  isCurrentUser,
  onOpenImage,
}) => {
  const count = messages.length;
  const lastMessage = messages[count - 1];

  const time = new Date(lastMessage.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const senderRole = String(
    lastMessage.senderRole || messages[0]?.senderRole || "",
  );
  const isSupportSender =
    senderRole === "admin" ||
    senderRole === "super_admin" ||
    senderRole === "technician";
  const supportSenderName = safeUserName(
    lastMessage.senderName || messages[0]?.senderName,
    senderRole === "technician" ? "Technician" : "Support",
  );
  const supportFirstName =
    supportSenderName.split(/\s+/)[0] || supportSenderName;

  const { layout, visible, remaining } = useMemo(
    () => buildLayout(messages),
    [messages],
  );

  return (
    <div
      className={`w-full flex ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`group relative rounded-2xl shadow-sm overflow-hidden ${
          isCurrentUser
            ? "bg-gray-700 text-gray-100"
            : "bg-gray-800 text-gray-100"
        }`}
        style={{ maxWidth: "min(80%, 28rem)" }}
      >
        {/* support sender badge */}
        {isSupportSender && !isCurrentUser && (
          <div className="px-2 pt-1.5 mb-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
            <span className="max-w-[7rem] truncate normal-case tracking-normal text-slate-200">
              {supportFirstName}
            </span>
            <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] leading-none text-sky-100">
              Support
            </span>
          </div>
        )}

        {/* collage grid */}
        <div style={layout.containerStyle}>
          {visible.map((msg, idx) => {
            const cellLayout = layout.cells[idx] ?? {};
            const isLastVisible = idx === visible.length - 1;
            const showOverlay =
              remaining > 0 && isLastVisible ? `+${remaining}` : undefined;

            const cellStyle: React.CSSProperties = {
              ...(cellLayout.gridColumn
                ? { gridColumn: cellLayout.gridColumn }
                : {}),
              ...(cellLayout.gridRow ? { gridRow: cellLayout.gridRow } : {}),
              ...(cellLayout.aspectRatio
                ? { aspectRatio: cellLayout.aspectRatio }
                : {}),
              ...(cellLayout.height ? { height: cellLayout.height } : {}),
              ...(cellLayout.width ? { width: cellLayout.width } : {}),
            };

            return (
              <MemoizedCell
                key={msg.id}
                message={msg}
                style={cellStyle}
                fitMode={cellLayout.fitMode ?? "cover"}
                onOpen={() =>
                  onOpenImage?.({
                    src: getSrc(msg),
                    messageId: String(msg.id),
                  })
                }
                overlay={showOverlay}
              />
            );
          })}
        </div>

        {/* timestamp + status */}
        <div className="px-2 pb-1">
          <MessageStatus
            message={lastMessage}
            isCurrentUser={isCurrentUser}
            time={time}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(MediaCollageBubble);
