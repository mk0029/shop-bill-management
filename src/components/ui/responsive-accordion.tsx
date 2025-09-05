"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ResponsiveAccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  removePX?: boolean;
  /**
   * Controlled open state. When provided, the component becomes controlled
   * and relies on onOpenChange to update.
   */
  open?: boolean;
  /** Callback fired when the open state intends to change */
  onOpenChange?: (open: boolean) => void;
  /**
   * If true, the section starts open on mobile. Defaults to false (collapsed on mobile).
   */
  defaultOpenMobile?: boolean;
  /**
   * If true, the accordion is collapsible on desktop as well (not always open).
   * Defaults to false to preserve previous behaviour (desktop always expanded).
   */
  desktopCollapsible?: boolean;
  /**
   * Optional right-aligned header content (e.g., actions). Shown on all breakpoints.
   */
  headerRight?: React.ReactNode;
}

/**
 * ResponsiveAccordion
 * - Mobile (md:hidden): collapsible with a toggle button
 * - Desktop (md:block): content is always expanded (no toggle)
 */
export function ResponsiveAccordion({
  title,
  children,
  className,
  defaultOpenMobile = false,
  headerRight,
  removePX=false,
  open: controlledOpen,
  onOpenChange,
  desktopCollapsible = false,
}: ResponsiveAccordionProps) {
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpenMobile);
  const open = useMemo(
    () => (controlledOpen !== undefined ? controlledOpen : internalOpen),
    [controlledOpen, internalOpen]
  );

  const toggle = () => {
    const next = !open;
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  return (
    <div className={`rounded-lg border border-gray-800 bg-gray-900 ${className ?? ""}`}>
      {/* Header */}
      <div   onClick={toggle} className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 cursor-pointer select-none">
        <div className="flex items-center gap-3 min-w-0 w-full">
          <div className="font-semibold text-white truncate w-full">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {/* Mobile toggle */}
          <button
            type="button"
            onClick={toggle}
            className={`${desktopCollapsible ? "inline-flex" : "md:hidden inline-flex"} items-center gap-2 text-gray-300 hover:text-white px-2 py-1`}
            aria-expanded={open}
            aria-label="Toggle section"
          >
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="inline-flex"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>
        </div>
      </div>

      {/* Content */}
      {/* Desktop: always visible; Mobile: animated collapse */}
      {/* Desktop always open when not collapsible */}
      {!desktopCollapsible && (
        <div className={`${removePX ? "" : "pb-3 px-3 sm:px-4 sm:pb-4"} hidden md:block`}>{children}</div>
      )}
      {/* Animated container for mobile, and for desktop when collapsible */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="accordion-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`${removePX ? "" : "px-3 pb-3 sm:px-4 sm:pb-4"} ${desktopCollapsible ? "" : "md:hidden"} overflow-hidden`}
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResponsiveAccordion;
