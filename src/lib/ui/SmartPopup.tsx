import React from "react";
import Portal from "@/lib/ui/Portal";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorPoint?: { x: number; y: number };
  preferred?: "left" | "right" | "top" | "bottom";
  margin?: number;
  padding?: number;
  className?: string;
  children: React.ReactNode;
};

export default function SmartPopup({ open, onClose, anchorPoint, className, children }: Props) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 20, top: 20 });

  useLayoutEffect(() => {
    if (!open) return;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = popupRef.current?.offsetWidth || 200;
    const h = popupRef.current?.offsetHeight || 120;
    const anchorX = anchorPoint?.x ?? 20;
    const anchorY = anchorPoint?.y ?? 20;

    let left = anchorX;
    let top = anchorY;

    if (left + w + margin > vw) left = Math.max(margin, vw - w - margin);
    if (left < margin) left = margin;
    if (top + h + margin > vh) top = Math.max(margin, vh - h - margin);
    if (top < margin) top = margin;

    setPos({ left, top });
  }, [open, anchorPoint?.x, anchorPoint?.y]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && popupRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handleCloseAll = () => onClose();

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("smartpopup:close-all" as any, handleCloseAll);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("smartpopup:close-all" as any, handleCloseAll);
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[3000]" onClick={onClose} />
      <div
        ref={popupRef}
        className={`fixed z-[3001] rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl ${className || ""}`}
        style={{ left: pos.left, top: pos.top }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </Portal>
  );
}
