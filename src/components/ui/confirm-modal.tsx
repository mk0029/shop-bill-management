"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { useConfirmStore } from "@/store/confirm-store";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";

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
  const prevActiveRef = useRef<Element | null>(null);

  const variant = options.variant || "primary";
  const styles = variantStyles[variant];

  useEffect(() => {
    if (open) {
      prevActiveRef.current = document.activeElement;
      cancelRef.current?.focus();
      return () => {
        (prevActiveRef.current as HTMLElement)?.focus?.();
      };
    }
  }, [open]);

  return (
    <BaseGlassModal isOpen={open} onClose={handleCancel} title="" showCloseButton={false} mobileType="modal" zIndex={3000}>
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
    </BaseGlassModal>
  );
}
