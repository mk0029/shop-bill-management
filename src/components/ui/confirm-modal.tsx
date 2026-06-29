"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { createPortal } from "react-dom";
import { useConfirmStore } from "@/store/confirm-store";

const variantStyles = {
  destructive: {
    confirmBg: "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500",
    icon: <AlertTriangle size={22} className="text-red-400" />,
    iconBg: "bg-red-500/15 ring-red-400/25",
  },
  warning: {
    confirmBg: "bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500",
    icon: <AlertTriangle size={22} className="text-amber-400" />,
    iconBg: "bg-amber-500/15 ring-amber-400/25",
  },
  primary: {
    confirmBg: "bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500",
    icon: <Info size={22} className="text-emerald-400" />,
    iconBg: "bg-emerald-500/15 ring-emerald-400/25",
  },
};

export function ConfirmModal() {
  const { open, options, handleConfirm, handleCancel } = useConfirmStore();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef<Element | null>(null);

  const variant = options.variant || "primary";
  const styles = variantStyles[variant];

  // Focus trap + restore focus
  useEffect(() => {
    if (open) {
      prevActiveRef.current = document.activeElement;
      cancelRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
        if (e.key === "Tab") {
          const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        (prevActiveRef.current as HTMLElement)?.focus?.();
      };
    }
  }, [open, handleCancel]);

  // Android back button
  useEffect(() => {
    if (!open) return;
    const onPopState = () => handleCancel();
    window.addEventListener("popstate", onPopState);
    window.history.pushState({ confirmModal: true }, "");
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.confirmModal) window.history.back();
    };
  }, [open, handleCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-desc"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.8 }}
            className="mx-auto w-[92vw] max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/75 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-4 px-6 pb-2 pt-7 text-center">
              <div className={`grid h-14 w-14 place-items-center rounded-full ring-1 ${styles.iconBg}`}>
                {styles.icon}
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-lg font-semibold text-white">
                  {options.title}
                </h3>
                {options.description && (
                  <p id="confirm-modal-desc" className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {options.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-4">
              {!options.hideCancel && (
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.12] active:scale-[0.97]"
                >
                  {options.cancelText || "Cancel"}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`${options.hideCancel ? "w-full" : "flex-1"} rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/20 transition active:scale-[0.97] ${styles.confirmBg}`}
              >
                {options.confirmText || "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
