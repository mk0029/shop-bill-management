"use client";

import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useBackClose } from "@/hooks/useBackClose";

interface BaseGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  zIndex?: number;
  mobileType?: "modal" | "bottom-sheet";
  className?: string;
  hideBackdrop?: boolean;
  backCloseId?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw]",
};

export function BaseGlassModal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = "md",
  zIndex = 300,
  mobileType = "bottom-sheet",
  className,
  hideBackdrop,
  backCloseId,
}: BaseGlassModalProps) {
  const [mounted, setMounted] = useState(false);
  const generatedId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useBackClose({
    isOpen,
    onClose,
    id: backCloseId || title || `glass-modal-${generatedId}`,
  });

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center overflow-hidden"
          style={{ zIndex }}
        >
          {/* Backdrop — thin dim overlay, no blur (blur lives on the panel) */}
          {!hideBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={onClose}
            />
          )}

          {/* Glass Panel — the visible frosted-glass surface */}
          <motion.div
            initial={
              mobileType === "bottom-sheet"
                ? { y: "100%", opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 20 }
            }
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={
              mobileType === "bottom-sheet"
                ? { y: "100%", opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 20 }
            }
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "glass-modal relative w-full backdrop-blur-2xl flex flex-col",
              "bg-transparent border border-white/[0.12]",
              "shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_rgba(255,255,255,0.1)_inset]",
              mobileType === "bottom-sheet"
                ? "sm:rounded-[22px] sm:mx-4 max-h-[100dvh] sm:max-h-[90dvh]"
                : "rounded-[10px] sm:mx-4 max-md:max-h-[100dvh] max-h-[90dvh]",
              sizeClasses[size],
              className,
            )}
            style={{
              paddingBottom:
                mobileType === "bottom-sheet"
                  ? "env(safe-area-inset-bottom, 0px)"
                  : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glass highlight — top inner glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none rounded-t-[22px]" />

            {/* Header — sticky at top */}
            {(title || showCloseButton) && (
              <div
                className={`glass-modal-header sticky top-0 z-20 shrink-0 flex items-center justify-between border-b border-white/[0.08] px-5 bg-white/[0.02] backdrop-blur-xl ${!title && showCloseButton ? "py-1" : "py-4"}`}
              >
                {title && (
                  <h2 className="text-lg font-semibold text-white/90 min-w-0 truncate">
                    {title}
                  </h2>
                )}
                {!title && <div />}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-all text-white/40 hover:text-white/80"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Scroll area — the only scrollable region */}
            <div className="glass-modal-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-5 py-4 min-h-0 max-sm:w-full">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
