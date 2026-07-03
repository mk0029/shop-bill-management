import React, { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Play, Pause, Loader2 } from "lucide-react";
import Portal from "@/lib/ui/Portal";
import { useBackClose } from "@/hooks/useBackClose";

interface VideoViewerModalProps {
  open: boolean;
  src: string;
  mediaFileName?: string;
  onClose: () => void;
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

const VideoViewerModal: React.FC<VideoViewerModalProps> = ({
  open,
  src,
  mediaFileName,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      const v = videoRef.current;
      if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
      setPlaying(false);
      setCur(0);
      setDur(0);
      setVideoLoaded(false);
      return;
    }
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v) v.play().catch(() => {});
    });
    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    };
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useBackClose({
    isOpen: open,
    onClose: handleClose,
    id: `chat-video-viewer-${mediaFileName || src}`,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === " " || e.key === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || seeking) return;
    setCur(v.currentTime);
  };

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setDur(v.duration || 0);
  };

  const handleSeekMouseDown = () => setSeeking(true);

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.currentTime = val;
    setCur(val);
  };

  const handleSeekMouseUp = () => setSeeking(false);

  const handleDownload = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = mediaFileName || "video.mp4";
    a.click();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const progress = dur > 0 ? cur / dur : 0;

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-md"
            onClick={handleBackdropClick}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative mx-auto flex w-[92vw] h-full max-h-[80dvh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-2xl md:w-[min(900px,85vw)] md:max-h-[85dvh]"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="text-sm font-medium text-slate-200">
                  {mediaFileName || "Video"}
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.12] hover:text-white"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video area - absolute positioning ensures correct fit */}
              <div className="relative min-h-0 flex-1 bg-black/60">
                <video
                  ref={videoRef}
                  src={src}
                  className="absolute inset-0 h-full w-full object-contain"
                  preload="auto"
                  playsInline
                  onClick={togglePlay}
                  onTimeUpdate={onTimeUpdate}
                  onLoadedMetadata={onLoadedMeta}
                  onLoadedData={() => setVideoLoaded(true)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />

                {!videoLoaded && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-white/60" />
                  </div>
                )}

                {/* Play/pause overlay icon */}
                <motion.div
                  initial={false}
                  animate={{ opacity: playing ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-black/40 backdrop-blur-sm md:h-16 md:w-16">
                    {playing ? (
                      <Pause size={28} className="text-white/90 md:size-8" />
                    ) : (
                      <Play size={28} className="ml-1 text-white/90 md:size-8" />
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Bottom controls */}
              <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.04] px-4 py-2.5">
                <span className="min-w-[2.5rem] text-center text-xs tabular-nums text-slate-300">
                  {fmt(cur)}
                </span>

                <input
                  type="range"
                  min={0}
                  max={dur || 0}
                  step={0.1}
                  value={cur}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onInput={handleSeekInput}
                  onChange={handleSeekInput}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-emerald-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400"
                  style={{
                    height: "4px",
                    background: `linear-gradient(to right, #34d399 ${progress * 100}%, rgba(255,255,255,0.15) ${progress * 100}%)`,
                  }}
                />

                <span className="min-w-[2.5rem] text-center text-xs tabular-nums text-slate-300">
                  {dur > 0 ? fmt(dur) : "--:--"}
                </span>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.1] hover:text-white"
                  title="Download"
                >
                  <Download size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export default VideoViewerModal;
