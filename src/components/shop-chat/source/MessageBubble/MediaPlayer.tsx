import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import Portal from "@/lib/ui/Portal";
import { markMediaLoaded, isMediaLoaded } from "@/lib/loaded-media-cache";
import { AudioPlayer } from "@/components/ui/audio-player";
import { getCachedMediaBlob } from "@/lib/chat-cache";
import { Message } from "@/lib/types";
import VideoViewerModal from "./VideoViewerModal";
import { useBackClose } from "@/hooks/useBackClose";

interface MediaPlayerProps {
  type: "image" | "video" | "audio" | "file";
  src: string;
  timeLabel?: string;
  uploading?: boolean;
  uploadProgress?: number;
  onOpenImage?: (src: string) => void;
  onOpenVideo?: (src: string) => void;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaMimeType?: string;
  mediaFileName?: string;
  message?: Message;
}

const VideoPlayer: React.FC<{
  src: string;
  timeLabel?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaFileName?: string;
  onOpenVideo?: (src: string) => void;
  uploading?: boolean;
  uploadProgress?: number;
}> = ({
  src,
  timeLabel,
  mediaWidth,
  mediaHeight,
  mediaFileName,
  onOpenVideo,
  uploading,
  uploadProgress,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [cacheSrc, setCacheSrc] = useState("");
  const cacheBlobUrlRef = useRef("");

  const aspectRatio = useMemo(() => {
    if (mediaWidth && mediaHeight) return `${mediaWidth} / ${mediaHeight}`;
    return "16 / 9";
  }, [mediaWidth, mediaHeight]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (videoRef.current) observerRef.current.observe(videoRef.current);
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (shouldLoad) return;
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        obs.disconnect();
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (src.startsWith("blob:") || src.startsWith("data:")) { setCacheSrc(src); return; }
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

  const handleVideoClick = () => {
    if (!loaded) return;
    if (onOpenVideo) {
      onOpenVideo(src);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        ref={videoRef as any}
        onClick={handleVideoClick}
        className="relative w-[min(92vw,420px)] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-black text-left"
        style={{ aspectRatio, maxHeight: "min(70vh, 500px)" }}
      >
        {shouldLoad && cacheSrc && (
          <video
            src={cacheSrc}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            preload="auto"
            muted
            playsInline
            onLoadedData={() => {
              setLoaded(true);
              setShowPlayOverlay(true);
            }}
          />
        )}

        {/* Loading spinner (non-blocking overlay) */}
        {!loaded && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-white/70" />
          </div>
        )}

        {/* Play button overlay */}
        {loaded && showPlayOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-black/50 backdrop-blur-sm transition-transform hover:scale-105">
              <Play size={28} className="ml-1 text-white/90" />
            </div>
          </div>
        )}

        {timeLabel && (
          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/90 z-10">
            {timeLabel}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/60 z-10">
            {typeof uploadProgress === "number" ? (
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                }}
              />
            ) : (
              <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
            )}
          </div>
        )}
      </button>
    </div>
  );
};

const ImagePlayer: React.FC<{
  src: string;
  timeLabel?: string;
  uploading?: boolean;
  uploadProgress?: number;
  onOpenImage?: (src: string) => void;
  mediaWidth?: number;
  mediaHeight?: number;
}> = ({ src, timeLabel, uploading, uploadProgress, onOpenImage, mediaWidth, mediaHeight }) => {
  const [visible, setVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(isMediaLoaded(src));
  const [imgOpen, setImgOpen] = useState(false);
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [cacheSrc, setCacheSrc] = useState("");
  const cacheBlobUrlRef = useRef("");

  const aspectRatio = useMemo(() => {
    if (mediaWidth && mediaHeight) return `${mediaWidth} / ${mediaHeight}`;
    return "1 / 1";
  }, [mediaWidth, mediaHeight]);

  useEffect(() => {
    if (src.startsWith("blob:") || src.startsWith("data:")) { setCacheSrc(src); return; }
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
    if (!onOpenImage) return;
    setImgOpen(false);
  }, [onOpenImage, src]);

  useBackClose({
    isOpen: imgOpen,
    onClose: () => setImgOpen(false),
    id: `chat-image-viewer-${src}`,
  });

  useEffect(() => {
    if (!imgOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImgOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [imgOpen]);

  useEffect(() => {
    if (imgLoaded) { setVisible(true); return; }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [src, imgLoaded]);

  const onLoad = () => {
    setImgLoaded(true);
    markMediaLoaded(src);
  };

  return (
    <>
      <button
        ref={containerRef}
        type="button"
        onClick={() => {
          if (onOpenImage) {
            onOpenImage(src);
            return;
          }
          setImgOpen(true);
        }}
        className="relative flex w-[min(62vw,320px)] max-w-full items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-black"
        style={{ aspectRatio, maxHeight: "min(60vh, 400px)" }}>
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-700/40 rounded-xl" />
        )}
        {visible && cacheSrc && (
          <img
            src={cacheSrc}
            alt="image"
            className="absolute top-0 left-0 h-full w-full object-contain"
            decoding="async"
            loading="lazy"
            onLoad={onLoad}
            onError={onLoad}
          />
        )}
        {uploading && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/60 z-10">
            {typeof uploadProgress === "number" ? (
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                }}
              />
            ) : (
              <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
            )}
          </div>
        )}
        {timeLabel && (
          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/90 z-10">
            {timeLabel}
          </div>
        )}
      </button>

      <AnimatePresence>
        {imgOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/90 cursor-zoom-out"
              onClick={() => setImgOpen(false)}>
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src={cacheSrc || src}
                  alt="image"
                  className="max-w-[100vw] max-h-[100vh] object-contain"
                />
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};

const FilePlayer: React.FC<{ src: string }> = ({ src }) => {
  const mime = src.startsWith("data:") ? src.slice(5, src.indexOf(";") > 0 ? src.indexOf(";") : src.indexOf(",")).toLowerCase() : "";
  const label = mime.includes("markdown")
    ? "Markdown file"
    : mime.startsWith("text/")
      ? "Text file"
      : mime.includes("pdf")
        ? "PDF file"
        : "File attachment";
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="inline-flex max-w-[min(62vw,320px)] items-center gap-3 rounded-xl border border-slate-600/60 bg-slate-900/70 px-3 py-2.5 text-slate-100 shadow-inner transition hover:bg-slate-800/90">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200">
        DOC
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-400">Open / download</span>
      </span>
    </a>
  );
};

const MediaPlayer: React.FC<MediaPlayerProps> = ({
  type,
  src,
  timeLabel,
  uploading,
  uploadProgress,
  onOpenImage,
  onOpenVideo,
  mediaWidth,
  mediaHeight,
  mediaMimeType,
  mediaFileName,
}) => {
  switch (type) {
    case "image":
      return (
        <ImagePlayer
          src={src}
          timeLabel={timeLabel}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onOpenImage={onOpenImage}
          mediaWidth={mediaWidth}
          mediaHeight={mediaHeight}
        />
      );
    case "video":
      return (
        <VideoPlayer
          src={src}
          timeLabel={timeLabel}
          mediaWidth={mediaWidth}
          mediaHeight={mediaHeight}
          mediaFileName={mediaFileName}
          onOpenVideo={onOpenVideo}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      );
    case "audio":
      return (
        <div className="relative w-[min(360px,85vw)] max-w-full">
          <AudioPlayer src={src} />
          {uploading && (
            <div className="absolute left-0 right-0 bottom-1 h-1 bg-black/60">
              {typeof uploadProgress === "number" ? (
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                  }}
                />
              ) : (
                <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
              )}
            </div>
          )}
        </div>
      );
    case "file":
      return <FilePlayer src={src} />;
    default:
      return null;
  }
};

export default MediaPlayer;
