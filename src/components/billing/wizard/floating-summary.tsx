"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ChevronUp, X } from "lucide-react";
import { formatCurrency } from "@/lib/inventory-helpers";

interface FloatingSummaryProps {
  selectedItems: any[];
  formData: any;
  calculateTotal: () => number;
  calculateGrandTotal: () => number;
  getPaymentDetails: () => {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount: number;
    balanceAmount: number;
  };
  onOpenPaymentStep: () => void;
}

export function FloatingSummary({
  selectedItems,
  formData,
  calculateTotal,
  calculateGrandTotal,
  getPaymentDetails,
  onOpenPaymentStep,
}: FloatingSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const grandTotal = calculateGrandTotal();
  const total = calculateTotal();
  const itemCount = selectedItems.length;
  const discount = Number(formData.discount || 0);
  const additionalFees = Number(formData.repairFee || 0) + Number(formData.visitingCharges || 0);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-sm:left-4 max-sm:right-4">
      {/* Collapsed pill */}
      {!expanded && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg"
          style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.2)" }}
          >
            <ShoppingCart className="w-3.5 h-3.5" style={{ color: "rgba(56,189,248,0.7)" }} />
          </div>
          <span className="text-white text-xs font-medium">{itemCount}</span>
          <span className="text-white text-sm font-semibold">{formatCurrency(grandTotal)}</span>
          <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.4)" }} />
        </motion.button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="rounded-2xl overflow-hidden shadow-lg max-sm:w-full"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: "1px solid rgba(255,255,255,0.12)",
              minWidth: "280px",
              maxWidth: "360px",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" style={{ color: "rgba(56,189,248,0.6)" }} />
                <span className="text-white text-xs font-medium">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
              </div>
              <button type="button" onClick={() => setExpanded(false)}
                className="p-1 rounded-lg" style={{ color: "rgba(148,163,184,0.4)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Items */}
            <div className="px-4 py-2 max-h-36 overflow-y-auto space-y-1">
              {selectedItems.slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[160px]" style={{ color: "rgba(148,163,184,0.7)" }}>
                    {item.name} x{item.quantity}
                  </span>
                  <span style={{ color: "rgba(148,163,184,0.5)" }}>{formatCurrency(item.total)}</span>
                </div>
              ))}
              {selectedItems.length > 8 && (
                <div className="text-[10px] text-center pt-1" style={{ color: "rgba(148,163,184,0.3)" }}>
                  +{selectedItems.length - 8} more
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="px-4 pb-3 space-y-1">
              <div className="flex justify-between text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                <span>Subtotal</span><span>{formatCurrency(total)}</span>
              </div>
              {additionalFees > 0 && (
                <div className="flex justify-between text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                  <span>Fees</span><span>{formatCurrency(additionalFees)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs" style={{ color: "rgba(52,211,153,0.5)" }}>
                  <span>Discount</span><span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-white pt-1 border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span>Total</span><span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Go to Payment */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => { setExpanded(false); onOpenPaymentStep(); }}
                className="w-full text-xs py-2 rounded-xl font-medium transition-all"
                style={{
                  background: "rgba(56,189,248,0.1)",
                  border: "1px solid rgba(56,189,248,0.15)",
                  color: "rgba(56,189,248,0.8)",
                }}
              >
                Go to Payment & Review
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
