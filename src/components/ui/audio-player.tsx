"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { Waveform } from "./waveform"
import { getCachedMediaMeta, cacheMediaMeta } from "@/lib/chat-cache"
import { useAudioPlaybackStore } from "@/lib/audio-playback-store"

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60).toString().padStart(2, "0")
  return `${m}:${ss}`
}

function extractWaveformData(buffer: AudioBuffer, bars: number): number[] {
  const channelData = buffer.getChannelData(0)
  const blockSize = Math.max(1, Math.floor(channelData.length / bars))
  const data: number[] = []
  for (let i = 0; i < bars; i++) {
    let sum = 0
    for (let j = i * blockSize; j < (i + 1) * blockSize && j < channelData.length; j++) {
      sum += Math.abs(channelData[j])
    }
    data.push(Math.min(1, (sum / blockSize) * 3))
  }
  return data
}

function devLog(...args: unknown[]) {
}

/**
 * Preload audio metadata and return duration.
 * Handles WebM where loadedmetadata fires with duration=Infinity
 * by seeking to a large offset to force the real duration.
 */
function preloadAudioDuration(url: string, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.crossOrigin = "anonymous"
    audio.preload = "metadata"

    let done = false
    const finish = (err?: Error, dur?: number) => {
      if (done) return
      cleanup()
      if (err) { done = true; reject(err); return }
      if (dur !== undefined && isFinite(dur) && dur > 0) {
        done = true; resolve(dur)
      }
    }

    const onMeta = () => {
      const d = audio.duration
      devLog("loadedmetadata fired", d)
      if (isFinite(d) && d > 0) {
        finish(undefined, d)
        return
      }
      // WebM workaround: duration is often Infinity on first metadata
      if (audio.duration >= 0) {
        audio.currentTime = 999999999
      }
    }

    const onDurationChange = () => {
      const d = audio.duration
      devLog("durationchange fired", d)
      if (isFinite(d) && d > 0) {
        finish(undefined, d)
      }
    }

    const onSeeked = () => {
      const d = audio.duration
      devLog("seeked fired", d)
      if (isFinite(d) && d > 0) {
        finish(undefined, d)
      }
    }

    const onError = () => {
      const msg = audio.error?.message || "load failed"
      devLog("error", msg)
      finish(new Error(msg))
    }

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("durationchange", onDurationChange)
      audio.removeEventListener("seeked", onSeeked)
      audio.removeEventListener("error", onError)
      if (signal) signal.removeEventListener("abort", onAbort)
      audio.removeAttribute("src")
      audio.load()
    }

    const onAbort = () => { finish(new Error("aborted")) }
    if (signal) signal.addEventListener("abort", onAbort, { once: true })

    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("durationchange", onDurationChange)
    audio.addEventListener("seeked", onSeeked)
    audio.addEventListener("error", onError)
    audio.src = url
    audio.load()

    setTimeout(() => {
      if (!done) {
        devLog("timeout")
        finish(new Error("timeout"))
      }
    }, 6000)
  })
}

interface AudioPlayerProps {
  src: string
  className?: string
  mimeType?: string
  size?: number
  presetDuration?: number
}

export function AudioPlayer({ src, className, mimeType, size, presetDuration }: AudioPlayerProps) {
  const aRef = useRef<HTMLAudioElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const durRef = useRef(0)
  const decodedBufferRef = useRef<AudioBuffer | null>(null)
  const shouldLoadRef = useRef(false)
  const loadedMetaForRef = useRef("")
  const visibleRef = useRef(false)
  const disposedRef = useRef(false)

  const [visible, setVisible] = useState(presetDuration && presetDuration > 0)
  const [state, setState] = useState<"idle" | "loading" | "ready" | "playing" | "paused" | "failed">(
    presetDuration && presetDuration > 0 ? "ready" : "idle"
  )
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(presetDuration && presetDuration > 0 ? presetDuration : 0)
  const [retryKey, setRetryKey] = useState(0)
  const [localProgress, setLocalProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>(() =>
    Array.from({ length: 80 }, () => 0.1 + Math.random() * 0.3)
  )

  const setActiveAudio = useAudioPlaybackStore((s) => s.setActive)
  const clearActiveAudio = useAudioPlaybackStore((s) => s.clearActive)
  const progress = isDragging ? localProgress : (dur > 0 ? cur / dur : 0)

  // ── IntersectionObserver: start loading when near viewport ──
  useEffect(() => {
    if (presetDuration && presetDuration > 0) return
    disposedRef.current = false

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          visibleRef.current = true
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px" },
    )
    observer.observe(el)

    // Fallback: if observer doesn't fire within 500ms, load anyway
    const fallback = setTimeout(() => {
      if (!visibleRef.current) {
        visibleRef.current = true
        setVisible(true)
        observer.disconnect()
      }
    }, 500)

    return () => {
      disposedRef.current = true
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [src, retryKey, presetDuration])

  // ── Step 1: Load duration from cache or preload metadata ──
  useEffect(() => {
    if (!visible) return
    if (dur > 0) return
    if (shouldLoadRef.current) return
    const metaKey = src + retryKey
    if (loadedMetaForRef.current === metaKey) return
    loadedMetaForRef.current = metaKey
    shouldLoadRef.current = true

    let disposed = false
    const controller = new AbortController()

    async function loadMeta() {
      try {
        if (src.startsWith("blob:") || src.startsWith("data:")) {
          if (!disposed) { setState("ready"); shouldLoadRef.current = false }
          return
        }

        // Check IndexedDB cache first
        const cached = await getCachedMediaMeta(src)
        if (disposed) return
        if (cached && isFinite(cached.duration) && cached.duration > 0) {
          const d = cached.duration
          setDur(d)
          durRef.current = d
          setState("ready")
          devLog("metadata loaded (cache)", d)
          return
        }

        // Cache miss: load metadata from CDN URL
        devLog("start loading", src)
        if (!disposed) setState("loading")
        const duration = await preloadAudioDuration(src, controller.signal)
        if (disposed) return

        if (isFinite(duration) && duration > 0) {
          durRef.current = duration
          setDur(duration)
          setState("ready")
          devLog("metadata loaded", duration)

          cacheMediaMeta({
            url: src,
            type: "audio",
            duration,
            durationFormatted: fmt(duration),
            mimeType: mimeType || "",
            size: size || 0,
            updatedAt: Date.now(),
          })
        } else {
          setState("ready")
          devLog("metadata loaded but invalid", duration)
        }
      } catch (err) {
        if (disposed) return
        devLog("metadata load failed", err instanceof Error ? err.message : err)
        setState("ready")
      } finally {
        if (!disposed) shouldLoadRef.current = false
      }
    }

    loadMeta()

    return () => {
      disposed = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, src, retryKey])

  // ── Step 2: Set up playback audio element ──
  useEffect(() => {
    const a = aRef.current
    if (!a || !src) return

    let disposed = false
    let cleanupListeners: (() => void) | null = null

    const resolved = resolveSrc(src)

    const onTime = () => { setCur(a.currentTime || 0) }
    const onEnded = () => {
      setState("ready")
      stopRaf()
      clearActiveAudio(src)
    }
    const onPlay = () => setState("playing")
    const onPause = () => { if (a.currentTime > 0) setState("paused") }
    const onError = () => {
      if (!disposed && !a.currentSrc) {
        devLog("playback error", a.error?.message || "unknown")
        setState("failed")
      }
    }

    a.addEventListener("timeupdate", onTime)
    a.addEventListener("ended", onEnded)
    a.addEventListener("play", onPlay)
    a.addEventListener("pause", onPause)
    a.addEventListener("error", onError)

    cleanupListeners = () => {
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("ended", onEnded)
      a.removeEventListener("play", onPlay)
      a.removeEventListener("pause", onPause)
      a.removeEventListener("error", onError)
    }

    a.src = resolved
    a.preload = "auto"
    a.load()

    return () => {
      disposed = true
      stopRaf()
      if (cleanupListeners) cleanupListeners()
      a.pause()
      a.removeAttribute("src")
      a.load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, retryKey])

  // ── Background: fetch audio for waveform data (optional, doesn't block UI) ──
  useEffect(() => {
    if (!visible) return

    let disposed = false
    const resolved = resolveSrc(src)

    const loadWaveform = async () => {
      try {
        const resp = await fetch(resolved)
        if (!resp.ok || disposed) return
        const data = await resp.arrayBuffer()
        if (disposed) return
        const tempCtx = new OfflineAudioContext(1, 1, 44100)
        const buf = await tempCtx.decodeAudioData(data.slice(0))
        if (disposed) return
        const realDur = buf.duration
        if (isFinite(realDur) && realDur > 0 && durRef.current <= 0) {
          setDur(realDur)
          durRef.current = realDur
        }
        setWaveformData(extractWaveformData(buf, 80))
        decodedBufferRef.current = buf
      } catch {
        // Waveform data is optional; default bars remain
      }
    }
    loadWaveform()

    return () => { disposed = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, src, retryKey])

  // ── rAF for smooth progress during playback ──
  const rafRef = useRef(0)
  const startRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const animate = () => {
      const a = aRef.current
      if (a && !a.paused) setCur(a.currentTime)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [])

  const stopRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Toggle play/pause ──
  const toggle = useCallback(async () => {
    const a = aRef.current
    if (!a || state === "loading" || state === "failed") return

    if (a.paused) {
      setActiveAudio(src, () => { a.pause(); stopRaf(); setState("paused") })
      try {
        await a.play()
        startRaf()
      } catch {
        setState("paused")
      }
    } else {
      a.pause()
      stopRaf()
      clearActiveAudio(src)
    }
  }, [src, state, startRaf, stopRaf, setActiveAudio, clearActiveAudio])

  const isPlaying = state === "playing"

  // ── Seek ──
  const onSeek = useCallback((time: number) => {
    const a = aRef.current
    if (!a) return
    a.currentTime = time
    setCur(time || 0)
  }, [])

  const handleSeek = useCallback((clientX: number) => {
    const container = waveformContainerRef.current
    if (!container || dur <= 0) return
    const rect = container.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const p = x / rect.width
    setLocalProgress(p)
    onSeek(p * dur)
  }, [dur, onSeek])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleSeek(e.clientX)
  }, [handleSeek])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => handleSeek(e.clientX)
    const onUp = () => setIsDragging(false)
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
  }, [isDragging, handleSeek])

  const handleRetry = useCallback(() => {
    shouldLoadRef.current = false
    loadedMetaForRef.current = ""
    visibleRef.current = true
    setVisible(true)
    setState("idle")
    setDur(0)
    durRef.current = 0
    setCur(0)
    setRetryKey(k => k + 1)
  }, [])

  return (
    <div ref={containerRef} className={className}>
      {state === "failed" ? (
        <FailedState onRetry={handleRetry} />
      ) : state === "loading" && visible ? (
        <LoadingState />
      ) : !visible || state === "idle" ? (
        <IdleState />
      ) : (
        <PlayerUI
          isPlaying={isPlaying}
          cur={cur}
          dur={dur}
          progress={progress}
          waveformData={waveformData}
          onToggle={toggle}
          onSeek={onSeek}
          onMouseDown={handleMouseDown}
          waveformContainerRef={waveformContainerRef}
        />
      )}

      <audio ref={aRef} />
    </div>
  )
}

function resolveSrc(raw: string): string {
  if (!raw.startsWith("data:")) return raw
  try {
    const commaIdx = raw.indexOf(",")
    if (commaIdx < 0) return raw
    const metaPart = raw.slice(5, commaIdx)
    const dataPart = raw.slice(commaIdx + 1)
    const isBase64 = metaPart.includes(";base64")
    let binaryStr: string
    if (isBase64) {
      binaryStr = atob(dataPart)
    } else {
      binaryStr = decodeURIComponent(dataPart)
    }
    const bytes = new Uint8Array(binaryStr.length)
    for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j)
    const mime = metaPart.split(";")[0] || "audio/webm"
    const blob = new Blob([bytes], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    return raw
  }
}

// ── Sub-components ──

function IdleState() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-600/60 bg-slate-900/70 shadow-inner min-h-[76px]">
      <div className="flex items-start gap-3 px-3 pt-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-500/30 bg-slate-700/50 text-slate-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1" />
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5 text-[11px] text-slate-500" style={{ paddingLeft: "52px" }}>
        <span>--:--</span>
        <span>--:--</span>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-600/60 bg-slate-900/70 shadow-inner min-h-[76px]">
      <div className="flex items-start gap-3 px-3 pt-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-500/30 bg-slate-700/50">
          <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
        </div>
        <div className="min-w-0 flex-1" />
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5 text-[11px] text-slate-500" style={{ paddingLeft: "52px" }}>
        <span>--:--</span>
        <span>--:--</span>
      </div>
    </div>
  )
}

function FailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-600/40 bg-red-900/30 px-3 py-2.5 shadow-inner min-h-[74px]">
      <button
        type="button"
        onClick={onRetry}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-red-400/30 bg-red-500/15 text-red-300 transition-colors hover:bg-red-500/25"
        aria-label="Retry"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-red-300">Could not load audio</div>
      </div>
    </div>
  )
}

function PlayerUI({
  isPlaying,
  cur,
  dur,
  progress,
  waveformData,
  onToggle,
  onSeek,
  onMouseDown,
  waveformContainerRef,
}: {
  isPlaying: boolean
  cur: number
  dur: number
  progress: number
  waveformData: number[]
  onToggle: () => void
  onSeek: (t: number) => void
  onMouseDown: (e: React.MouseEvent) => void
  waveformContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-600/60 bg-slate-900/70 shadow-inner min-h-[76px]">
      <div className="flex items-start gap-3 px-3 pt-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25 active:scale-95"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
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
            ref={waveformContainerRef}
            className="relative cursor-pointer select-none overflow-hidden"
            onMouseDown={onMouseDown}
            role="slider"
            aria-label="Audio waveform scrubber"
            aria-valuemin={0}
            aria-valuemax={dur}
            aria-valuenow={cur}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") onSeek(Math.min(dur, cur + 2))
              if (e.key === "ArrowLeft") onSeek(Math.max(0, cur - 2))
            }}
          >
            <Waveform
              data={waveformData}
              barWidth={3}
              barGap={1}
              barRadius={2}
              height={36}
              barColor="rgb(148 163 184)"
              playedColor="#34d399"
              fadeEdges={false}
              active={isPlaying}
              progress={progress}
            />

            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-emerald-400/80"
              style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5 text-[11px] tabular-nums text-slate-300" style={{ paddingLeft: "52px" }}>
        <span>{fmt(cur)}</span>
        <span>{dur > 0 ? fmt(dur) : "--:--"}</span>
      </div>
    </div>
  )
}
