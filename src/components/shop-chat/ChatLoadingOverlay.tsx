"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, WifiOff, RefreshCw, ArrowLeft } from "lucide-react";

type LoadingPhase = "loading" | "timeout" | "offline";

interface ChatLoadingOverlayProps {
  loading: boolean;
  onRetry: () => void;
  onGoBack?: () => void;
  connected: boolean;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const go = () => setOnline(true);
    const gone = () => setOnline(false);
    window.addEventListener("online", go);
    window.addEventListener("offline", gone);
    return () => {
      window.removeEventListener("online", go);
      window.removeEventListener("offline", gone);
    };
  }, []);
  return online;
}

export default function ChatLoadingOverlay({
  loading,
  onRetry,
  onGoBack,
  connected,
}: ChatLoadingOverlayProps) {
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<LoadingPhase>("loading");

  useEffect(() => {
    if (!loading) {
      setPhase("loading");
      return;
    }
    if (!online || !connected) {
      setPhase("offline");
      return;
    }
    const t = setTimeout(() => setPhase("timeout"), 5000);
    return () => clearTimeout(t);
  }, [loading, online, connected]);

  useEffect(() => {
    if (!loading) return;
    if (!online || !connected) {
      setPhase("offline");
    }
  }, [online, connected, loading]);

  const handleContinueWaiting = useCallback(() => {
    setPhase("loading");
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-1 items-center justify-center p-6"
        >
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl">
            {phase === "offline" ? (
              <>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-500/15 ring-1 ring-red-400/25">
                  <WifiOff size={26} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Unable to load conversation
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  Please check your internet connection and try again.
                </p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.97]"
                  >
                    <RefreshCw size={16} />
                    Retry
                  </button>
                  {onGoBack && (
                    <button
                      type="button"
                      onClick={onGoBack}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.12] active:scale-[0.97]"
                    >
                      <ArrowLeft size={16} />
                      Go Back
                    </button>
                  )}
                </div>
              </>
            ) : phase === "timeout" ? (
              <>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/25">
                  <Loader2 size={26} className="animate-spin text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Still syncing messages...
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  This may take a little longer due to your connection.
                </p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.97]"
                  >
                    <RefreshCw size={16} />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueWaiting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.12] active:scale-[0.97]"
                  >
                    Continue waiting
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/25">
                  <Loader2 size={26} className="animate-spin text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Syncing conversation...
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  Please wait while your latest messages load.
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
