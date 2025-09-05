"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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
  // React.useEffect(() => {
  //   if (isOpen) {
  //     document.documentElement.classList.add("overflow-hidden");
  //   } else {
  //     document.documentElement.classList.remove("overflow-hidden");
  //   }
  // }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "relative bg-gray-900 border border-gray-800 rounded-lg shadow-2xl w-full max-h-[99dvh] sm:max-h-[90dvh] overflow-hidden h-fit",
            sizeClasses[size],
            className
          )}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between py-2 px-4 sm:p-6 border-b border-gray-800">
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
                  className="min-h-6 min-w-6 md:min-h-8 md:min-w-8 p-0 hover:bg-gray-800 touch-manipulation">
                  <X className="min-h-6 min-w-6 md:min-h-8 md:min-w-8" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="sm:p-4 p-3 md:p-6 overflow-auto max-h-[calc(99vh-120px)] sm:max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
