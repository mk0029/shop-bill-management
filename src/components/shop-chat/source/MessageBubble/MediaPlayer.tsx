import React, { useRef, useState, useEffect } from "react";
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

// Video Player Component — shows CSS skeleton until video metadata loads
const VideoPlayer: React.FC<{ src: string; timeLabel?: string }> = ({
  src,
  timeLabel,
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative w-[min(62vw,320px)] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-black aspect-video">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-600/50" />
            <div className="h-1.5 w-24 animate-pulse rounded-full bg-slate-600/40" />
          </div>
        </div>
      )}
      <video
        src={src}
        className="w-full h-full object-contain"
        controls
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0, position: loaded ? "relative" : "absolute" }}
      />
      {timeLabel && (
        <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/90 z-10">
          {timeLabel}
        </div>
      )}
    </div>
  );
};

// Audio Player Component — loads audio efficiently, shows real audio-reactive waveform
const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const aRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const objUrlRef = useRef<string>("");
  const blobRef = useRef<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "playing" | "paused" | "failed">("loading");
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const durRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [amps, setAmps] = useState<number[]>(() =>
    Array.from({ length: 46 }, (_, i) => {
      const seed = (i * 23 + 17) % 31;
      return 0.08 + ((seed * 19) % 62) / 100;
    })
  );

  const BAR_COUNT = 46;

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const resolveSrc = (raw: string): string => {
    if (!raw.startsWith("data:")) return raw;
    try {
      const commaIdx = raw.indexOf(",");
      if (commaIdx < 0) return raw;
      const metaPart = raw.slice(5, commaIdx);
      const dataPart = raw.slice(commaIdx + 1);
      const isBase64 = metaPart.includes(";base64");
      let binaryStr: string;
      if (isBase64) {
        binaryStr = atob(dataPart);
      } else {
        binaryStr = decodeURIComponent(dataPart);
      }
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const mime = metaPart.split(";")[0] || "audio/webm";
      const blob = new Blob([bytes], { type: mime });
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const prev = objUrlRef.current;
      if (prev) URL.revokeObjectURL(prev);
      objUrlRef.current = url;
      return url;
    } catch {
      return raw;
    }
  };

  const ensureAudioCtx = () => {
    if (audioCtxRef.current) return;
    const a = aRef.current;
    if (!a) return;
    try {
      const ctx = new AudioContext();
      const srcNode = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      srcNode.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = srcNode;
      analyserRef.current = analyser;
    } catch {
      // AudioContext / MediaElementSource not available — bars stay static
    }
  };

  const startAnimLoop = () => {
    stopAnimLoop();
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      const step = Math.max(1, Math.floor(dataArray.length / BAR_COUNT));
      const next: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const idx = Math.min(i * step, dataArray.length - 1);
        next.push(Math.pow(dataArray[idx] / 255, 0.55));
      }
      setAmps(next);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopAnimLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  useEffect(() => {
    const a = aRef.current;
    if (!a || !src) return;

    let disposed = false;
    const resolved = resolveSrc(src);

    setAmps(Array.from({ length: BAR_COUNT }, (_, i) => {
      const seed = (i * 23 + 17) % 31;
      return 0.08 + ((seed * 19) % 62) / 100;
    }));

    const onMeta = () => {
      let d = a.duration;
      if (!isFinite(d) || Number.isNaN(d)) {
        if (a.seekable && a.seekable.length > 0) {
          d = a.seekable.end(a.seekable.length - 1);
        } else {
          d = 0;
        }
      }
      if (d <= 0) d = 0;
      setDur(d);
      durRef.current = d;
      setState("ready");
    };
    const updateDurIfMissing = () => {
      if (durRef.current > 0) return;
      const d = a.duration;
      if (isFinite(d) && d > 0) { setDur(d); durRef.current = d; return; }
      if (a.seekable && a.seekable.length > 0) {
        const sd = a.seekable.end(a.seekable.length - 1);
        if (isFinite(sd) && sd > 0) { setDur(sd); durRef.current = sd; }
      }
    };
    const onTime = () => {
      setCur(a.currentTime || 0);
      if (durRef.current <= 0) updateDurIfMissing();
    };
    const onEnded = () => {
      setState("ready");
      stopAnimLoop();
      updateDurIfMissing();
    };
    const onPlay = () => { setState("playing"); ensureAudioCtx(); startAnimLoop(); };
    const onPause = () => { if (a.currentTime > 0) { setState("paused"); stopAnimLoop(); } };
    const onError = () => { if (!disposed) setState("failed"); };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("loadeddata", onMeta);
    a.addEventListener("canplay", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);

    a.src = resolved;
    a.preload = "auto";
    a.load();

    if (a.readyState >= 2) onMeta();

    // Async duration resolution for WebM files where duration is Infinity
    const tryDecodeDuration = async () => {
      let data: ArrayBuffer | null = null;
      const blob = blobRef.current;
      if (blob) {
        data = await blob.arrayBuffer();
      } else if (resolved.startsWith("blob:")) {
        try {
          const resp = await fetch(resolved);
          data = await resp.arrayBuffer();
        } catch {}
      }
      if (!data || disposed) return;
      try {
        const tempCtx = new OfflineAudioContext(1, 1, 44100);
        const buf = await tempCtx.decodeAudioData(data);
        const realDur = buf.duration;
        if (!disposed && isFinite(realDur) && realDur > 0 && durRef.current <= 0) {
          setDur(realDur);
          durRef.current = realDur;
        }
      } catch {
        // decodeAudioData not supported for this format
      }
    };
    tryDecodeDuration();

    const loadTimeout = window.setTimeout(() => {
      if (!disposed && a.readyState < 2) setState("failed");
    }, 8000);

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      stopAnimLoop();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("loadeddata", onMeta);
      a.removeEventListener("canplay", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.pause();
      a.removeAttribute("src");
      a.load();
      blobRef.current = null;
      const objUrl = objUrlRef.current;
      if (objUrl) { URL.revokeObjectURL(objUrl); objUrlRef.current = ""; }
    };
  }, [src, retryKey]);

  useEffect(() => {
    return () => {
      stopAnimLoop();
      if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
      audioCtxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  const toggle = () => {
    const a = aRef.current;
    if (!a || state === "loading" || state === "failed") return;
    if (a.paused) {
      ensureAudioCtx();
      a.play().catch(() => setState("paused"));
    } else {
      a.pause();
    }
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

  const isPlaying = state === "playing";

  return (
    <>
      {state === "failed" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-600/40 bg-red-900/30 px-3 py-2.5 shadow-inner">
          <button
            type="button"
            onClick={() => { setState("loading"); setDur(0); durRef.current = 0; setCur(0); setRetryKey((k) => k + 1); }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-400/30 bg-red-500/15 text-red-300 transition-colors hover:bg-red-500/25"
            aria-label="Retry">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-red-300">Could not load audio</div>
          </div>
        </div>
      ) : state === "loading" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-600/60 bg-slate-900/70 px-3 py-2.5 shadow-inner">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-500/30 bg-slate-700/50 text-slate-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex h-7 items-end gap-[2px] animate-pulse">
              {Array.from({ length: 20 }, (_, i) => (
                <span key={i} className="w-[3px] rounded-full bg-slate-600/60" style={{ height: `${18 + (i % 7) * 8}%` }} />
              ))}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>0:00</span>
              <span>0:00</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-600/60 bg-slate-900/70 px-3 py-2.5 shadow-inner">
          <button
            type="button"
            onClick={toggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25"
            aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? (
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
              {/* Base bars — muted */}
              <div className="pointer-events-none flex h-7 items-end gap-[2px]">
                {amps.map((amp, i) => {
                  const silent = amp < 0.08;
                  const h = silent ? 5 : Math.max(8, amp * 85);
                  return (
                    <span
                      key={`b-${i}`}
                      className="rounded-full transition-all duration-[60ms]"
                      style={{
                        width: silent ? "3.5px" : "2.5px",
                        height: `${h}%`,
                        background: silent ? "rgb(100 116 139 / 0.5)" : "rgb(100 116 139 / 0.7)",
                        borderRadius: silent ? "9999px" : "2px",
                      }}
                    />
                  );
                })}
              </div>

              {/* Fill bars — emerald, clipped by progress */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-full"
                style={{ width: waveFillPx }}>
                <div className="flex h-full items-end gap-[2px] px-1.5 py-1">
                  {amps.map((amp, i) => {
                    const silent = amp < 0.08;
                    const h = silent ? 5 : Math.max(8, amp * 85);
                    const extra = isPlaying ? 0.65 + Math.abs(Math.sin(cur * 4.3 + i * 0.28)) * 0.35 : 1;
                    return (
                      <span
                        key={`f-${i}`}
                        className="rounded-full transition-all duration-[60ms]"
                        style={{
                          width: silent ? "3.5px" : "2.5px",
                          height: `${Math.max(6, Math.min(100, h * extra))}%`,
                          background: silent ? "rgb(52 211 153 / 0.6)" : "rgb(52 211 153)",
                          borderRadius: silent ? "9999px" : "2px",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-300">
              <span>{fmt(cur)}</span>
              <span>{dur > 0 ? fmt(dur) : "0:00"}</span>
            </div>
          </div>
        </div>
      )}

      <audio ref={aRef} />
    </>
  );
};

// Image Player Component — loads image lazily, shows pure CSS skeleton (no duplicate img load)
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

  const startLoad = useRef(false);
  useEffect(() => {
    if (startLoad.current) return;
    startLoad.current = true;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => setImgLoaded(true);
    img.src = src;
  }, [src]);

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
          <div className="absolute inset-0 animate-pulse bg-slate-700/40 rounded-xl" />
        )}
        {imgLoaded && (
          <img
            src={src}
            alt="image"
            className="absolute top-0 left-0 h-full w-full object-contain"
            decoding="async"
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
