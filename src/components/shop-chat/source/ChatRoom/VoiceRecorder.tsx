import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Send, X } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  className?: string;
  onRecordingChange?: (active: boolean) => void;
  inline?: boolean;
}

type Phase = "idle" | "starting" | "recording" | "sending" | "cancelled";

const MIN_DURATION_MS = 1000;

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSend,
  className = "",
  onRecordingChange,
  inline = false,
}) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [waveBarCount, setWaveBarCount] = useState(48);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const isFinishingRef = useRef(false);
  const waveWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = waveWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const computeCount = () => {
      const width = Math.max(120, el.clientWidth || 0);
      // Each bar takes roughly 4px (2px bar + 2px gap).
      const count = Math.max(24, Math.floor(width / 4));
      setWaveBarCount(count);
    };

    computeCount();
    const observer = new ResizeObserver(() => computeCount());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bars = useMemo(
    () =>
      Array.from({ length: waveBarCount }, (_, i) => {
        const seed = (i * 19 + 11) % 31;
        return 24 + ((seed * 13) % 54);
      }),
    [waveBarCount]
  );

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const stopStreams = () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {}
    streamRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetGesture = () => {
  };

  const resetIdle = () => {
    stopStreams();
    stopTimer();
    audioChunksRef.current = [];
    startedAtRef.current = 0;
    isFinishingRef.current = false;
    resetGesture();
    setLocked(false);
    setDurationMs(0);
    setPhase("idle");
    onRecordingChange?.(false);
  };

  const stopRecorder = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      recorder.onstop = done;
      try {
        if (recorder.state !== "inactive") recorder.stop();
        else done();
      } catch {
        done();
      }
    });
    mediaRecorderRef.current = null;
  };

  const finalizeRecording = async (keep: boolean) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    onRecordingChange?.(true);

    const elapsed = Math.max(0, Date.now() - (startedAtRef.current || Date.now()));
    await stopRecorder();
    stopStreams();
    stopTimer();

    if (!keep) {
      setPhase("cancelled");
      setTimeout(() => resetIdle(), 220);
      return;
    }

    if (elapsed < MIN_DURATION_MS) {
      toast("Recording too short");
      setPhase("cancelled");
      setTimeout(() => resetIdle(), 220);
      return;
    }

    const blob = new Blob(audioChunksRef.current, {
      type: "audio/webm;codecs=opus",
    });
    if (!blob.size) {
      setPhase("cancelled");
      setTimeout(() => resetIdle(), 220);
      return;
    }

    setPhase("sending");
    try {
      await onSend(blob);
    } catch (error) {
      console.error("Failed to send voice note:", error);
      toast.error("Voice note send failed, retrying in queue if offline.");
    } finally {
      resetIdle();
    }
  };

  const startRecording = async () => {
    if (phase !== "idle") return;
    try {
      setPhase("starting");
      onRecordingChange?.(true);
      startedAtRef.current = Date.now();
      setDurationMs(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 2 },
          sampleRate: { ideal: 48000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const recorder = new MediaRecorder(stream, mimeType ? ({ mimeType } as any) : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(100);

      startedAtRef.current = Date.now();
      setDurationMs(0);
      setLocked(true);
      setPhase("recording");

      timerRef.current = window.setInterval(() => {
        setDurationMs(Math.max(0, Date.now() - startedAtRef.current));
      }, 120);
    } catch (error) {
      console.warn("Voice recorder start failed", error);
      toast.error("Microphone permission required");
      resetIdle();
    }
  };

  useEffect(() => {
    const onVisibility = async () => {
      if (phase !== "recording" && phase !== "starting") return;
      if (document.visibilityState === "hidden") {
        // Safe fallback for browsers that stop capture on background:
        // finalize as cancel to avoid stuck recorder UI.
        await finalizeRecording(false);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility as any);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      resetIdle();
    };
  }, []);

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => void startRecording()}
        className={`grid h-11 w-11 place-items-center rounded-full border border-emerald-400/30 bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition-colors hover:from-emerald-400 hover:to-teal-500 active:scale-95 ${className}`}
        title="Record voice note"
      >
        <Mic size={18} />
      </button>
    );
  }

  if (phase === "sending") {
    return (
      <div
        className={`flex min-w-0 items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-800/95 px-3 py-2 ${className}`}
      >
        <Loader2 size={16} className="animate-spin text-emerald-300" />
        <span className="text-sm text-slate-200">Sending voice note...</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-w-0 items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-800/95 px-3 py-2 ${className}`}
    >
      <button
        type="button"
        onClick={() => {
          void finalizeRecording(false);
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-700/95 text-slate-200 transition-colors hover:bg-slate-600"
        title="Delete recording"
      >
        <X size={14} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-rose-300">
          <motion.span
            className="h-2 w-2 rounded-full bg-rose-400"
            animate={{ scale: [1, 1.45, 1] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          />
          <span>{phase === "starting" ? "Starting..." : "Recording..."}</span>
          <span className="tabular-nums text-slate-200">
            {phase === "starting" ? "0:00" : formatDuration(durationMs)}
          </span>
          {locked ? (
            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-200">
              Locked
            </span>
          ) : null}
        </div>
        <div
          ref={waveWrapRef}
          className="relative overflow-hidden rounded-full bg-slate-700/55 px-1.5 py-1"
        >
          <div className="flex h-5 items-end gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={`bar-${i}`}
                className="w-[2px] rounded-full bg-emerald-300/85"
                style={{
                  height: `${Math.max(18, Math.min(100, h * (0.35 + Math.sin((durationMs / 240) + i * 0.35) * 0.08)))}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-1 text-[11px] text-slate-300/80">
          {phase === "starting"
            ? "Preparing microphone..."
            : locked
            ? "Tap send when ready"
            : "Recording..."}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void finalizeRecording(true)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-400"
        title="Send voice note"
      >
        <Send size={14} />
      </button>

    </div>
  );
};

export default VoiceRecorder;
