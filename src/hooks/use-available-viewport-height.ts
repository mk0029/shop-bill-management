"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Returns the available viewport height for a page shell,
 * calculated as: window.innerHeight - appHeaderOffset - safePadding.
 *
 * Uses ResizeObserver to detect dynamic header/layout changes.
 * Updates on resize, orientation change, and layout shift.
 */
export function useAvailableViewportHeight(
  safePadding = 0,
): { height: number; shellRef: (el: HTMLElement | null) => void } {
  const [height, setHeight] = useState(0);
  const shellElRef = useRef<HTMLElement | null>(null);

  const measure = useCallback(() => {
    if (!shellElRef.current) {
      // Fallback: measure from window
      setHeight(window.innerHeight - safePadding);
      return;
    }
    const rect = shellElRef.current.getBoundingClientRect();
    // The shell's available height = distance from shell top to window bottom, minus safe padding
    const available = window.innerHeight - rect.top - safePadding;
    setHeight(Math.max(200, available));
  }, [safePadding]);

  // Callback ref to get shell element
  const shellRef = useCallback((el: HTMLElement | null) => {
    shellElRef.current = el;
    if (el) {
      // Measure on first mount
      requestAnimationFrame(measure);
    }
  }, [measure]);

  useEffect(() => {
    measure();

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", () => {
      setTimeout(measure, 150);
    });

    // Watch for layout changes (sidebar toggles, etc.)
    const observer = new ResizeObserver(measure);
    const shell = shellElRef.current;
    if (shell) observer.observe(shell);
    // Also watch the admin-main for height changes
    const main = document.querySelector("main.admin-main");
    if (main) observer.observe(main);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      observer.disconnect();
    };
  }, [measure]);

  return { height, shellRef };
}
