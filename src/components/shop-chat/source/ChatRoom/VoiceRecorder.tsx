import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  className?: string;
  onRecordingChange?: (active: boolean) => void;
  inline?: boolean;
}

type Phase = "idle" | "starting" | "recording" | "sending" | "cancelled";

const MIN_DURATION_MS = 1000;
const BAR_COUNT = 50;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0)
  );

  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        baseHeight: 8 + seededRandom(i) * 28,
        speed: 0.6 + seededRandom(i + 100) * 1.4,
        phase: seededRandom(i + 200) * Math.PI * 2,
      })),
    []
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
    analyserRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAnimFrame = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const resetIdle = () => {
    stopStreams();
    stopTimer();
    stopAnimFrame();
    audioChunksRef.current = [];
    startedAtRef.current = 0;
    isFinishingRef.current = false;
    setLocked(false);
    setDurationMs(0);
    setPhase("idle");
    setWaveAmplitudes(Array.from({ length: BAR_COUNT }, () => 0));
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
    stopAnimFrame();

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

  const startWaveAnimation = () => {
    stopAnimFrame();

    const analyser = analyserRef.current;
    if (analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        const step = Math.max(1, Math.floor(dataArray.length / BAR_COUNT));
        const newAmps: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(i * step, dataArray.length - 1);
          const raw = dataArray[idx] / 255;
          newAmps.push(Math.pow(raw, 0.5));
        }
        setWaveAmplitudes(newAmps);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      const t0 = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - t0) / 1000;
        const newAmps: number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
          const wave =
            Math.sin(elapsed * 3.5 + i * 0.45) * 0.3 +
            Math.sin(elapsed * 5.2 + i * 0.28) * 0.2 +
            Math.sin(elapsed * 1.8 + i * 0.7) * 0.15 +
            0.35;
          return Math.max(0.05, Math.min(1, wave));
        });
        setWaveAmplitudes(newAmps);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
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

      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        // fallback: no real audio analysis, animated bars will still work
      }

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

      startWaveAnimation();
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

              {/* Waveform — dots that grow into bars based on voice intensity */}
              <div className="flex h-6 w-full items-center justify-center gap-[2px]">
                {bars.map((bar, i) => {
                  const amp = waveAmplitudes[i] || 0;
                  const isSilent = amp < 0.08;
                  const barHeight = Math.max(3, amp * 100);
                  return (
                    <motion.div
                      key={i}
                      className="rounded-full bg-emerald-400"
                      animate={{
                        width: isSilent ? 3.5 : 2.5,
                        height: isSilent ? 3.5 : `${barHeight}%`,
                        opacity: isSilent ? 0.35 : 0.35 + amp * 0.65,
                        borderRadius: isSilent ? "9999px" : "2px",
                      }}
                      transition={{
                        height: { duration: 0.05, ease: "easeOut" },
                        width: { duration: 0.2, ease: "easeInOut" },
                        opacity: { duration: 0.05 },
                        borderRadius: { duration: 0.2 },
                      }}
                    />
                  );
                })}
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
