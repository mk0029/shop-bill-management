"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md sm:max-w-md",
  md: "max-w-full sm:max-w-lg",
  lg: "max-w-full sm:max-w-2xl",
  xl: "max-w-full sm:max-w-4xl",
  full: "max-w-full sm:max-w-[95vw]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const bodyOverflow = document.body.style.overflow;
      const htmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = bodyOverflow;
        document.documentElement.style.overflow = htmlOverflow;
      };
    } else {
      // document.documentElement.classList.remove("overflow-hidden");
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex h-[var(--app-vh,100dvh)] items-center justify-center overflow-y-auto p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/68 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "relative my-auto h-fit w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/86 text-slate-100 shadow-2xl shadow-black/45 backdrop-blur-2xl max-h-[calc(var(--app-vh,100dvh)-1.5rem)] sm:max-h-[calc(var(--app-vh,100dvh)-2rem)]",
            sizeClasses[size],
            className
          )}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-xl sm:p-6">
              {title && (
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  // size="sm"
                  onClick={onClose}
                  className="min-h-6 min-w-6 p-0 touch-manipulation hover:bg-white/[0.08] md:min-h-8 md:min-w-8">
                  <X className="min-h-6 min-w-6 md:min-h-8 md:min-w-8" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="overflow-auto p-3 max-h-[calc(var(--app-vh,100dvh)-8rem)] sm:p-4 md:p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
