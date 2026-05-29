import { useMemo } from "react";

export function useSmartPlacement(anchorRef: React.RefObject<HTMLElement>, popupRef: React.RefObject<HTMLElement>, opts?: { preferred?: "top" | "bottom" | "left" | "right"; margin?: number; }) {
  const style = useMemo(() => {
    const a = anchorRef.current;
    if (!a || typeof window === "undefined") return {};
    const r = a.getBoundingClientRect();
    const margin = opts?.margin ?? 8;
    if (opts?.preferred === "bottom") return { top: r.bottom + margin, left: r.left };
    if (opts?.preferred === "left") return { top: r.top, left: Math.max(8, r.left - 260) };
    if (opts?.preferred === "right") return { top: r.top, left: r.right + margin };
    return { top: Math.max(8, r.top - margin), left: r.left };
  }, [anchorRef.current, opts?.preferred, opts?.margin]);

  return { style, recompute: () => {} };
}
