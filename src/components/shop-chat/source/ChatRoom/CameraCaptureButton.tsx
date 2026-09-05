import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, RotateCw, Send, SlidersHorizontal, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "@/lib/ui/Portal";

interface CameraCaptureButtonProps {
  onCapture: (file: File) => Promise<void>;
  disabled?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

const CameraCaptureButton: React.FC<CameraCaptureButtonProps> = ({
  onCapture,
  disabled = false,
  className = "",
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"live" | "preview">("live");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [busy, setBusy] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [flash, setFlash] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {}
    streamRef.current = null;
    setHasStream(false);
  };

  const resetEdit = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setShowEdit(false);
  };

  const applyTrackZoom = async (value: number) => {
    try {
      const track = streamRef.current?.getVideoTracks?.()[0] as MediaStreamTrack & {
        getCapabilities?: () => any;
        applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
      };
      if (!track?.getCapabilities || !track?.applyConstraints) return;
      const caps = track.getCapabilities() as any;
      const z = caps?.zoom;
      if (!z) return;
      await track.applyConstraints({
        advanced: [{ zoom: value }] as any,
      });
    } catch {
      // fallback to CSS transform zoom only
    }
  };

  const syncZoomCapabilities = () => {
    try {
      const track = streamRef.current?.getVideoTracks?.()[0] as MediaStreamTrack & {
        getCapabilities?: () => any;
      };
      if (!track?.getCapabilities) {
        setZoomRange({ min: 1, max: 3, step: 0.01 });
        return;
      }
      const caps = track.getCapabilities() as any;
      if (caps?.zoom) {
        const min = Number(caps.zoom.min || 1);
        const max = Number(caps.zoom.max || 3);
        const step = Number(caps.zoom.step || 0.01);
        setZoomRange({ min, max, step });
        setZoom((prev) => Math.min(max, Math.max(min, prev)));
      } else {
        setZoomRange({ min: 1, max: 3, step: 0.01 });
      }
    } catch {
      setZoomRange({ min: 1, max: 3, step: 0.01 });
    }
  };

  const resetCapture = () => {
    if (capturedUrl) {
      try {
        URL.revokeObjectURL(capturedUrl);
      } catch {}
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
    setView("live");
    setZoom(1);
    setCameraError(null);
    resetEdit();
  };

  const startStream = async (mode: "user" | "environment") => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setZoom(1);
      syncZoomCapabilities();
      setHasStream(true);
    } catch (error) {
      console.error("Camera start failed:", error);
      setHasStream(false);
      const err = error as DOMException;
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is in use by another app. Close it and try again.");
      } else {
        setCameraError("Unable to access camera.");
      }
    }
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      resetCapture();
      return;
    }
    if (view === "live") {
      startStream(facingMode);
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open, facingMode, view]);

  useEffect(() => {
    return () => {
      stopStream();
      if (capturedUrl) {
        try {
          URL.revokeObjectURL(capturedUrl);
        } catch {}
      }
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !hasStream || busy) return;

    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    if (!width || !height) return;

    setBusy(true);
    try {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 160);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(video, 0, 0, width, height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
          "image/jpeg",
          0.94
        );
      });
      const nextUrl = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(nextUrl);
      setView("preview");
    } catch (error) {
      console.error("Capture send failed:", error);
    } finally {
      setBusy(false);
    }
  };

  const exportEditedBlob = async (): Promise<Blob> => {
    const sourceBlob = capturedBlob;
    const sourceUrl = capturedUrl;
    if (!sourceBlob || !sourceUrl) throw new Error("No captured image");

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = sourceUrl;
    });

    const angle = ((rotation % 360) + 360) % 360;
    const swap = angle === 90 || angle === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? image.height : image.width;
    canvas.height = swap ? image.width : image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image export failed"))),
        "image/jpeg",
        0.94
      );
    });
  };

  const handleSendCaptured = async () => {
    if (busy || !capturedBlob) return;
    setBusy(true);
    try {
      const finalBlob = await exportEditedBlob();
      const file = new File([finalBlob], `camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await onCapture(file);
      setOpen(false);
      onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to send captured image:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
        className={`grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50 ${className}`}
        title="Camera">
        <Camera size={17} />
      </button>

      <AnimatePresence>
        {open && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/85">
              <div className="relative h-full w-full">
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 z-30 bg-white"
                    />
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenChange?.(false);
                  }}
                  className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white">
                  <X size={18} />
                </button>

                {view === "live" ? (
                  <div className="h-full w-full overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="h-full w-full object-contain transition-transform duration-150"
                      style={{ transform: `scale(${zoom})` }}
                    />
                  </div>
                ) : (
                  <div className="relative h-full w-full bg-black">
                    {capturedUrl ? (
                      <img
                        src={capturedUrl}
                        alt="Captured"
                        className="h-full w-full object-contain"
                        style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                          transform: `rotate(${rotation}deg)`,
                        }}
                      />
                    ) : null}

                    <AnimatePresence>
                      <motion.div
                        key="captured-feedback"
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full border border-emerald-400/40 bg-black/50 px-3 py-1 text-xs text-emerald-200">
                        <span className="inline-flex items-center gap-1">
                          <Check size={14} />
                          Captured
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}

                {view === "live" && !hasStream && (
                  <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/80">
                    {cameraError || "Unable to access camera"}
                  </div>
                )}

                {view === "live" ? (
                  <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-4">
                    <div className="mx-auto mb-3 flex w-full max-w-[360px] items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white/90">
                      <span className="text-[11px]">Zoom</span>
                      <input
                        type="range"
                        min={zoomRange?.min ?? 1}
                        max={zoomRange?.max ?? 3}
                        step={zoomRange?.step ?? 0.01}
                        value={zoom}
                        onChange={async (e) => {
                          const next = Number(e.target.value);
                          setZoom(next);
                          await applyTrackZoom(next);
                        }}
                        className="w-full accent-emerald-400"
                      />
                      <span className="w-10 text-right text-[11px] tabular-nums">
                        {zoom.toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setFacingMode((prev) =>
                          prev === "user" ? "environment" : "user"
                        )
                      }
                      className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white disabled:opacity-60">
                      <RefreshCw size={18} />
                    </button>

                    <button
                      type="button"
                      disabled={busy || !hasStream}
                      onClick={handleCapture}
                      className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-transparent disabled:opacity-60">
                      <span className="h-11 w-11 rounded-full bg-white" />
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onOpenChange?.(false);
                        }}
                        className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                        Cancel
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setView("live")}
                          className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEdit((v) => !v)}
                          className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                          <span className="inline-flex items-center gap-1">
                            <SlidersHorizontal size={14} />
                            Edit
                          </span>
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSendCaptured}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
                        <span className="inline-flex items-center gap-1">
                          <Send size={14} />
                          Send
                        </span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {showEdit && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="grid gap-2 rounded-xl bg-black/35 p-2 text-xs text-white/85">
                          <label className="grid grid-cols-[70px_1fr] items-center gap-2">
                            <span>Bright</span>
                            <input
                              type="range"
                              min={50}
                              max={150}
                              value={brightness}
                              onChange={(e) => setBrightness(Number(e.target.value))}
                            />
                          </label>
                          <label className="grid grid-cols-[70px_1fr] items-center gap-2">
                            <span>Contrast</span>
                            <input
                              type="range"
                              min={50}
                              max={150}
                              value={contrast}
                              onChange={(e) => setContrast(Number(e.target.value))}
                            />
                          </label>
                          <label className="grid grid-cols-[70px_1fr] items-center gap-2">
                            <span>Saturate</span>
                            <input
                              type="range"
                              min={50}
                              max={170}
                              value={saturation}
                              onChange={(e) => setSaturation(Number(e.target.value))}
                            />
                          </label>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRotation((r) => (r + 90) % 360)}
                              className="rounded-full bg-white/10 px-3 py-1.5">
                              <span className="inline-flex items-center gap-1">
                                <RotateCw size={13} />
                                Rotate
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={resetEdit}
                              className="rounded-full bg-white/10 px-3 py-1.5">
                              <span className="inline-flex items-center gap-1">
                                <Undo2 size={13} />
                                Reset
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};

export default CameraCaptureButton;
