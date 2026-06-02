import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/lib/ui/Portal";

interface MediaPlayerProps {
  type: "image" | "video" | "audio" | "file";
  src: string;
  timeLabel?: string;
  uploading?: boolean;
  uploadProgress?: number;
  onOpenImage?: (src: string) => void;
}

// Video Player Component
const VideoPlayer: React.FC<{ src: string; timeLabel?: string }> = ({
  src,
  timeLabel,
}) => {
  return (
    <div
      className="relative w-[min(62vw,320px)] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-black aspect-video">
      <video
        src={src}
        className="w-full h-full object-contain"
        controls
        preload="metadata"
      />
      {timeLabel && (
        <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/90">
          {timeLabel}
        </div>
      )}
    </div>
  );
};

// Audio Player Component
const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const aRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const bars = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const seed = (i * 23 + 17) % 31;
        return 18 + ((seed * 19) % 62);
      }),
    []
  );

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  useEffect(() => {
    const a = aRef.current;
    if (!a) return;
    const onLoaded = () => {
      setDur(a.duration || 0);
      setReady(true);
    };
    const onTime = () => setCur(a.currentTime || 0);
    const onEnded = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    if (a.readyState >= 1) onLoaded();
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    const a = aRef.current;
    if (!a) return;
    setPlaying(false);
    setCur(0);
    setDur(0);
    setReady(false);
  }, [src]);

  const toggle = () => {
    const a = aRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const a = aRef.current;
    if (!a) return;
    a.currentTime = (dur || 0) * (v / 100);
  };

  const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
  const waveFillPx = `${pct}%`;

  const onWaveSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = aRef.current;
    const wrap = waveRef.current;
    if (!a || !wrap || !dur) return;
    const box = wrap.getBoundingClientRect();
    if (!box.width) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    a.currentTime = dur * ratio;
    setCur(a.currentTime || 0);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-600/60 bg-slate-900/70 px-3 py-2.5 shadow-inner">
      <button
        type="button"
        onClick={toggle}
        className="grid h-9 w-9 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25"
        aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          ref={waveRef}
          onClick={onWaveSeek}
          className="relative cursor-pointer select-none overflow-hidden rounded-full bg-slate-700/50 px-1.5 py-1"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Audio progress">
          <div className="pointer-events-none flex h-7 items-end gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={`base-${i}`}
                className="w-[3px] rounded-full bg-slate-500/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-full"
            style={{ width: waveFillPx }}>
            <div className="flex h-full items-end gap-[2px] px-1.5 py-1">
              {bars.map((h, i) => (
                <span
                  key={`fill-${i}`}
                  className="w-[3px] rounded-full bg-emerald-300"
                  style={{
                    height: `${Math.max(
                      20,
                      Math.min(
                        100,
                        h * (playing ? 0.72 + Math.abs(Math.sin(cur * 4.3 + i * 0.28)) * 0.38 : 1)
                      )
                    )}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-300">
          <span>{ready ? fmt(cur) : "0:00"}</span>
          <span>{ready ? fmt(dur) : "0:00"}</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={pct}
        onChange={onSeek}
        className="sr-only"
      />
      <audio ref={aRef} src={src} preload="metadata" />
    </div>
  );
};

// Image Player Component
const ImagePlayer: React.FC<{
  src: string;
  timeLabel?: string;
  uploading?: boolean;
  uploadProgress?: number;
  onOpenImage?: (src: string) => void;
}> = ({ src, timeLabel, uploading, uploadProgress, onOpenImage }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    if (!onOpenImage) return;
    setImgOpen(false);
  }, [onOpenImage, src]);

  useEffect(() => {
    if (!imgOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImgOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [imgOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onOpenImage) {
            onOpenImage(src);
            return;
          }
          setImgOpen(true);
        }}
        className="relative flex w-[min(62vw,320px)] max-w-full items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-black aspect-square"
        style={{ maxHeight: "320px" }}>
        {!imgLoaded && (
          <>
            <img
              src={src}
              alt="preview"
              className="absolute top-0 left-0 h-full w-full scale-105 object-cover blur-xl opacity-45"
              loading="eager"
            />
            <div className="absolute inset-0 animate-pulse bg-slate-700/35" />
          </>
        )}
        <img
          src={src}
          alt="image"
          className="absolute top-0 left-0 h-full w-full transition-opacity duration-200 object-contain"
          style={{ opacity: imgLoaded ? 1 : 0 }}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
        />
        {uploading && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/60">
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
          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/90">
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
                  src={src}
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

// File Player Component
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
        />
      );
    case "video":
      return (
        <div className="relative w-[min(62vw,320px)] max-w-full">
          <VideoPlayer src={src} timeLabel={timeLabel} />
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
    case "audio":
      return (
        <div className="relative w-[min(58vw,300px)] max-w-full">
          <AudioPlayer src={src} />
          {uploading && (
            <div className="absolute left-0 right-0 -bottom-1 h-1 bg-black/40">
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
