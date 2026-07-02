"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";

type AvatarCropModalProps = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
};

const FRAME = 320;
const OUTPUT = 1024;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function AvatarCropModal({ open, imageSrc, onClose, onConfirm }: AvatarCropModalProps) {
  const [saving, setSaving] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);
  const [dragging, setDragging] = useState(false);

  const cropPx = useMemo(() => {
    const base = Math.max(1, Math.min(imgSize.w, imgSize.h));
    const side = clamp(base / Math.max(zoom, MIN_ZOOM), 1, base);
    const half = side / 2;
    const cx = clamp(centerX * imgSize.w, half, imgSize.w - half);
    const cy = clamp(centerY * imgSize.h, half, imgSize.h - half);
    return {
      sx: clamp(cx - half, 0, Math.max(0, imgSize.w - side)),
      sy: clamp(cy - half, 0, Math.max(0, imgSize.h - side)),
      sw: side,
      sh: side,
    };
  }, [centerX, centerY, imgSize, zoom]);

  useEffect(() => {
    if (!open || !imageSrc) return;
    setSaving(false);
    setZoom(1);
    setCenterX(0.5);
    setCenterY(0.5);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: Math.max(1, img.naturalWidth || 1), h: Math.max(1, img.naturalHeight || 1) });
    };
    img.src = imageSrc;
  }, [imageSrc, open]);

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img) return;
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      out.width = OUTPUT;
      out.height = OUTPUT;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(img, cropPx.sx, cropPx.sy, cropPx.sw, cropPx.sh, 0, 0, OUTPUT, OUTPUT);
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.95));
      if (blob) await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseGlassModal isOpen={open} onClose={onClose} showCloseButton={false} mobileType="modal" size="md" zIndex={80}>
      {/* Ambient glass highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[60px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-white/[0.02]">
        <div>
          <div className="text-sm font-semibold text-white/90">Crop Profile Photo</div>
          <div className="mt-0.5 text-xs text-white/40">HD square output, drag to position</div>
        </div>
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-all text-white/40 hover:text-white/80">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <canvas
          ref={canvasRef}
          width={FRAME}
          height={FRAME}
          className="mx-auto h-[min(320px,78vw)] w-[min(320px,78vw)] cursor-grab rounded-2xl bg-black/80 ring-1 ring-white/10 active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            dragRef.current = { x: e.clientX, y: e.clientY, cx: centerX, cy: centerY };
          }}
          onPointerMove={(e) => {
            if (!dragging || !dragRef.current) return;
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            setCenterX(clamp(dragRef.current.cx - (dx / FRAME) * (cropPx.sw / imgSize.w), 0, 1));
            setCenterY(clamp(dragRef.current.cy - (dy / FRAME) * (cropPx.sh / imgSize.h), 0, 1));
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDragging(false);
            dragRef.current = null;
          }}
          onPointerCancel={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDragging(false);
            dragRef.current = null;
          }}
        />
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Zoom</label>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-emerald-500" />
            <div className="mt-1 text-right text-[11px] text-white/30">{zoom.toFixed(2)}x</div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Horizontal Position</label>
            <input type="range" min={0} max={1} step={0.001} value={centerX} onChange={(event) => setCenterX(Number(event.target.value))} className="w-full accent-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Vertical Position</label>
            <input type="range" min={0} max={1} step={0.001} value={centerY} onChange={(event) => setCenterY(Number(event.target.value))} className="w-full accent-emerald-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-4 py-3 bg-white/[0.02]">
        <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60 hover:bg-white/[0.08] transition-all">
          Cancel
        </button>
        <button type="button" disabled={saving} onClick={handleConfirm} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/80 px-3 py-2 text-sm text-white hover:bg-emerald-500/90 disabled:opacity-60 backdrop-blur-xl border border-emerald-400/20 transition-all">
          <Check size={15} />
          {saving ? "Saving..." : "Use Photo"}
        </button>
      </div>
    </BaseGlassModal>
  );
}
