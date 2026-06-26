import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { LiveWaveform } from "@/components/ui/live-waveform";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const isFinishingRef = useRef(false);
  const recorderStartedRef = useRef(false);

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

  const resetIdle = () => {
    stopStreams();
    stopTimer();
    audioChunksRef.current = [];
    startedAtRef.current = 0;
    isFinishingRef.current = false;
    recorderStartedRef.current = false;
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
      setTimeout(() => resetIdle(), 300);
      return;
    }

    if (elapsed < MIN_DURATION_MS) {
      toast("Recording too short");
      setPhase("cancelled");
      setTimeout(() => resetIdle(), 300);
      return;
    }

    const blob = new Blob(audioChunksRef.current, {
      type: "audio/webm;codecs=opus",
    });
    if (!blob.size) {
      setPhase("cancelled");
      setTimeout(() => resetIdle(), 300);
      return;
    }

    setPhase("sending");
    try {
      await onSend(blob);
    } catch (error) {
      console.error("Failed to send voice note:", error);
      toast.error("Failed to send voice note");
    } finally {
      resetIdle();
    }
  };

  const handleStreamReady = useCallback((stream: MediaStream) => {
    if (recorderStartedRef.current) return;
    recorderStartedRef.current = true;

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
    }, 100);
  }, []);

  const startRecording = () => {
    if (phase !== "idle") return;
    setPhase("starting");
    onRecordingChange?.(true);
    startedAtRef.current = Date.now();
    setDurationMs(0);
    recorderStartedRef.current = false;
  };

  useEffect(() => {
    const onVisibility = async () => {
      if (phase !== "recording" && phase !== "starting") return;
      if (document.visibilityState === "hidden") {
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

  const isRecording = phase === "recording" || phase === "starting";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.button
            key="mic"
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => void startRecording()}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-400/30 hover:scale-105 active:scale-95"
            title="Record voice note"
          >
            <Mic size={18} />
          </motion.button>
        )}

        {phase === "sending" && (
          <motion.div
            key="sending"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 backdrop-blur-xl"
          >
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-sm text-slate-200">Sending...</span>
          </motion.div>
        )}

        {isRecording && (
          <motion.div
            key="recorder"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 backdrop-blur-2xl shadow-lg shadow-black/20"
          >
            {/* Delete button */}
            <motion.button
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              onClick={() => void finalizeRecording(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-slate-300 transition-colors hover:bg-red-500/20 hover:text-red-300 active:scale-90"
              title="Delete recording"
            >
              <Trash2 size={15} />
            </motion.button>

            {/* Waveform + timer */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <motion.span
                  className="h-2 w-2 rounded-full bg-red-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                />
                <span className="text-xs font-medium text-slate-200 tabular-nums">
                  {formatDuration(durationMs)}
                </span>
                {locked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300"
                  >
                    LOCKED
                  </motion.span>
                )}
              </div>

              {/* Waveform */}
              <div className="flex h-6 w-full items-center justify-center">
                <LiveWaveform
                  active={isRecording}
                  onStreamReady={handleStreamReady}
                  barWidth={3}
                  barGap={1}
                  barRadius={2}
                  barColor="#34d399"
                  height={24}
                  fadeEdges={false}
                  mode="static"
                />
              </div>
            </div>

            {/* Send button */}
            <motion.button
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              onClick={() => void finalizeRecording(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 active:scale-90"
              title="Send voice note"
            >
              <Send size={14} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceRecorder;
