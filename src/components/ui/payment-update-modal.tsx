"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Building2,
  Smartphone,
  Landmark,
  Upload,
  AlertCircle,
  Clock,
  Percent,
} from "lucide-react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaymentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  currency?: string;
  onUpdatePayment: (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      paymentMethod?: string;
      discount?: number;
      discountReason?: string;
      notes?: string;
    },
  ) => Promise<void>;
}

const paymentMethods = [
  { id: "cash", label: "Cash", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "bank", label: "Bank Transfer", icon: Landmark },
  { id: "card", label: "Card", icon: Building2 },
];

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const PaymentUpdateModal = memo(function PaymentUpdateModal({
  isOpen,
  onClose,
  bill,
  currency = "₹",
  onUpdatePayment,
}: PaymentUpdateModalProps) {
  const grandTotal = toNum(bill?.totalAmount ?? bill?.total ?? 0);
  const existingDiscount = toNum(bill?.discount ?? 0);
  const alreadyPaid = toNum(bill?.paidAmount ?? 0);

  const [discount, setDiscount] = useState(String(existingDiscount));
  const [discountReason, setDiscountReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("partial");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const discountVal = Math.max(0, Number(discount) || 0);
  const effectiveTotal = Math.max(0, grandTotal - discountVal);
  const remaining = Math.max(0, effectiveTotal - alreadyPaid);
  const progressPct =
    effectiveTotal > 0 ? (alreadyPaid / effectiveTotal) * 100 : 0;

  useEffect(() => {
    if (isOpen) {
      setDiscount(String(existingDiscount));
      setDiscountReason("");
      setAmount("");
      setMethod("cash");
      setPaymentMode("partial");
      setNotes("");
      setShowSuccess(false);
      setError("");
    }
  }, [isOpen, existingDiscount]);

  const handleSubmit = useCallback(async () => {
    setError("");

    let payAmt: number;
    if (paymentMode === "full") {
      payAmt = remaining;
    } else {
      payAmt = Math.min(Math.max(Number(amount) || 0, 0), remaining);
    }

    if (payAmt <= 0 && paymentMode !== "full") {
      setError("Payment amount must be greater than 0");
      return;
    }
    if (payAmt < 0) {
      setError("Payment amount cannot be negative");
      return;
    }
    if (discountVal < 0) {
      setError("Discount cannot be negative");
      return;
    }

    if (payAmt + discountVal > remaining && paymentMode !== "full") {
      setError("Payment + discount cannot exceed remaining amount");
      return;
    }

    setIsProcessing(true);
    try {
      const billId = bill?._id || bill?.id || bill?.billId;
      if (!billId) return;

      const newPaid = alreadyPaid + payAmt;
      const isFull = newPaid >= effectiveTotal;

      await onUpdatePayment(String(billId), {
        paymentStatus: isFull ? "paid" : "partial",
        paidAmount: newPaid,
        balanceAmount: isFull ? 0 : Math.max(0, effectiveTotal - newPaid),
        paymentMethod: method,
        discount: discountVal > 0 ? discountVal : undefined,
        discountReason: discountReason || undefined,
        notes: notes || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setError("Failed to update payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    paymentMode,
    amount,
    remaining,
    discountVal,
    alreadyPaid,
    effectiveTotal,
    method,
    discountReason,
    notes,
    bill,
    onUpdatePayment,
    onClose,
  ]);

  const status = (bill?.paymentStatus || "pending").toLowerCase();
  const statusCfg: Record<string, { label: string; color: string }> = {
    paid: { label: "Paid", color: "text-emerald-300" },
    partial: { label: "Partially Paid", color: "text-amber-300" },
    pending: { label: "Pending", color: "text-sky-300" },
    overdue: { label: "Overdue", color: "text-rose-300" },
  };
  const st = statusCfg[status] || statusCfg.pending;

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={showSuccess ? undefined : "Update Payment"}
      size="lg"
      zIndex={350}
      showCloseButton={!showSuccess}
      mobileType="bottom-sheet"
    >
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white"
          >
            Payment Successful!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 mt-2"
          >
            {paymentMode === "full"
              ? "Bill marked as fully paid"
              : `${currency}${Number(amount || remaining).toFixed(2)} received via ${paymentMethods.find((m) => m.id === method)?.label || method}`}
          </motion.p>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium", st.color)}>
                  {st.label}
                </span>
              </div>
              <span className="text-xs text-white/30">
                Bill #{bill?.billNumber || bill?._id?.slice(-6)}
              </span>
            </div>

            <div className="glass-card-static p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Total Amount</span>
                <span className="text-white/80 font-medium">
                  {currency}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Discount</span>
                <span className="text-emerald-400">
                  -{currency}
                  {discountVal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Paid</span>
                <span className="text-emerald-400">
                  {currency}
                  {alreadyPaid.toFixed(2)}
                </span>
              </div>
              <div className="glass-divider my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/80">
                  Remaining
                </span>
                <span className="text-lg font-bold text-amber-300">
                  {currency}
                  {remaining.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Progress</span>
                <span className="text-white/60">
                  {currency}
                  {alreadyPaid.toFixed(2)} / {currency}
                  {effectiveTotal.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    progressPct >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-sky-500 to-indigo-500",
                  )}
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Payment Mode
              </label>
              <div className="flex gap-2">
                {(["partial", "full"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setPaymentMode(mode);
                      setError("");
                    }}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200",
                      paymentMode === mode
                        ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]",
                    )}
                  >
                    {mode === "full" ? "Mark Paid" : "Partial Payment"}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === "partial" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/40 font-semibold">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError("");
                      }}
                      min="0"
                      max={remaining}
                      step="1"
                      className="w-full glass-input !pl-10 !py-4 text-xl font-bold text-white"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() =>
                          setAmount(String((remaining * pct) / 100))
                        }
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          Number(amount) >= (remaining * pct) / 100 - 1 &&
                            Number(amount) <= (remaining * pct) / 100 + 1
                            ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                            : "border-white/[0.06] bg-white/[0.03] text-white/40 hover:bg-white/[0.06]",
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-medium text-white/80">
                    Discount
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-lg">{currency}</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      setError("");
                    }}
                    min="0"
                    className="flex-1 glass-input !p-3 text-sm text-white"
                    placeholder="0"
                  />
                </div>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full glass-input !p-2.5 text-xs text-white/70"
                  placeholder="Discount reason (optional)"
                />
                {discountVal > 0 && (
                  <p className="text-xs text-emerald-400/80">
                    Payable after discount: {currency}
                    {effectiveTotal.toFixed(2)}
                  </p>
                )}
              </motion.div>
            )}

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  const selected = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={cn(
                        "flex items-center gap-2.5 p-3.5 rounded-xl border transition-all duration-200",
                        selected
                          ? "border-white/20 bg-gradient-to-r from-white/[0.06] to-white/[0.02]"
                          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            selected ? "text-sky-300" : "text-white/60",
                          )}
                        />
                      </div>
                      <span className="text-sm text-white/70">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add payment notes..."
                rows={2}
                className="w-full glass-input !p-3 text-sm text-white resize-none"
              />
            </div>

            <div className="p-4 rounded-xl border-2 border-dashed border-white/[0.06] bg-white/[0.02] text-center">
              <Upload className="w-5 h-5 text-white/30 mx-auto mb-1" />
              <p className="text-xs text-white/30">
                Upload receipt (coming soon)
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-400 text-center">{error}</p>
            )}
          </div>

          <div className="flex items-center gap-3 px-5 py-4 border-t border-white/[0.08] shrink-0 glass-modal-header"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 !rounded-xl border-white/10 text-white/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isProcessing ||
                (paymentMode === "partial" && (!amount || Number(amount) <= 0))
              }
              className="flex-1 !rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0"
            >
              {isProcessing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {paymentMode === "full"
                    ? `Mark Paid — ${currency}${remaining.toFixed(2)}`
                    : `Record — ${currency}${(Number(amount) || 0).toFixed(2)}`}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </BaseGlassModal>
  );
});
