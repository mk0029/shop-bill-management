"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Wallet,
  CheckSquare,
  Square,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIndianRupee } from "@/lib/upi-utils";
import { checkPaymentsDisabled } from "@/lib/payments-config";

const GLASS =
  "bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-2xl border border-white/10";

interface UnpaidBill {
  _id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string;
}

interface MultiBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: UnpaidBill[];
  onPay: (amount: number, selectedBills: UnpaidBill[]) => void;
}

export function MultiBillPaymentModal({
  isOpen,
  onClose,
  bills,
  onPay,
}: MultiBillPaymentModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedBills = useMemo(
    () => bills.filter((b) => selectedIds.has(b._id)),
    [bills, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedBills.reduce((s, b) => s + (Number(b.balance) || 0), 0),
    [selectedBills]
  );

  useEffect(() => {
    if (isOpen) setSelectedIds(new Set());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleBill = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(bills.map((b) => b._id)));
  }, [bills]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handlePay = useCallback(() => {
    if (selectedTotal <= 0) return;
    if (checkPaymentsDisabled()) return;
    onPay(selectedTotal, selectedBills);
  }, [selectedTotal, selectedBills, onPay]);

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[400] flex items-center justify-center p-2 sm:p-4",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
      style={{ visibility: isOpen ? "visible" : "hidden" }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.96,
          y: isOpen ? 0 : 20,
        }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={cn("relative w-full max-w-lg rounded-[22px] shadow-2xl shadow-black/40 max-h-[96dvh] flex flex-col", GLASS)}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            Pay Multiple Bills
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-all text-white/40 hover:text-white/80">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {/* Select All / Clear */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Select Bills ({selectedIds.size} of {bills.length})
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-medium">Select All</button>
              <button onClick={clearAll} className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors font-medium">Clear</button>
            </div>
          </div>

          {/* Bill List with Checkboxes */}
          <div className="space-y-1.5">
            {bills.map((bill) => {
              const isSelected = selectedIds.has(bill._id);
              return (
                <button
                  key={bill._id}
                  onClick={() => toggleBill(bill._id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    isSelected
                      ? "border-purple-500/20 bg-purple-500/5"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <span className="shrink-0">
                    {isSelected ? <CheckSquare className="w-5 h-5 text-purple-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">Bill #{bill.billNumber}</p>
                    <p className="text-xs text-gray-500">Balance: ₹{bill.balance.toLocaleString()}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBills.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">Select bills above to proceed</p>
            </div>
          )}
        </div>

        {/* Footer with total + pay button */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Total to Pay</p>
            <p className="text-xl font-bold text-white">{formatIndianRupee(selectedTotal)}</p>
          </div>
          <button
            onClick={handlePay}
            disabled={selectedTotal <= 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <IndianRupee className="w-4 h-4" />
            Pay {formatIndianRupee(selectedTotal)}
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
