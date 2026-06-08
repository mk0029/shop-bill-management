"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !img || !ctx) return;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, FRAME, FRAME);
    ctx.drawImage(img, cropPx.sx, cropPx.sy, cropPx.sw, cropPx.sh, 0, 0, FRAME, FRAME);
  }, [cropPx, imgSize, open]);

  if (!open || !imageSrc) return null;

  const startDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragRef.current = { x: event.clientX, y: event.clientY, cx: centerX, cy: centerY };
  };

  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging || !dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setCenterX(clamp(dragRef.current.cx - (dx / FRAME) * (cropPx.sw / imgSize.w), 0, 1));
    setCenterY(clamp(dragRef.current.cy - (dy / FRAME) * (cropPx.sh / imgSize.h), 0, 1));
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    dragRef.current = null;
  };

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close cropper" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Crop Profile Photo</div>
            <div className="mt-0.5 text-xs text-slate-500">HD square output, drag to position</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <canvas
            ref={canvasRef}
            width={FRAME}
            height={FRAME}
            className="mx-auto h-[min(320px,78vw)] w-[min(320px,78vw)] cursor-grab rounded-2xl bg-black ring-1 ring-slate-700 active:cursor-grabbing"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Zoom</label>
              <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-emerald-500" />
              <div className="mt-1 text-right text-[11px] text-slate-500">{zoom.toFixed(2)}x</div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Horizontal Position</label>
              <input type="range" min={0} max={1} step={0.001} value={centerX} onChange={(event) => setCenterX(Number(event.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Vertical Position</label>
              <input type="range" min={0} max={1} step={0.001} value={centerY} onChange={(event) => setCenterY(Number(event.target.value))} className="w-full accent-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleConfirm} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60">
            <Check size={15} />
            {saving ? "Saving..." : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
