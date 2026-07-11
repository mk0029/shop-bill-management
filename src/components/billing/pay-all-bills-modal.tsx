"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  Banknote,
  Smartphone,
  Building2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PayAllBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    _id?: string;
    name?: string;
    phone?: string;
  };
  bills: any[];
  onPaid: () => void;
}

const paymentModes = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "other", label: "Other", icon: CreditCard },
];

interface BillPreview {
  id: string;
  billNumber: string;
  due: number;
  applied: number;
  status: "paid" | "partial" | "unchanged";
}

function distributePayment(
  bills: any[],
  amount: number,
): {
  previews: BillPreview[];
  totalApplied: number;
  fullyPaidCount: number;
  partialCount: number;
  unchangedCount: number;
} {
  const sorted = [...bills]
    .filter((b: any) => {
      const paid = Number(b.paidAmount || 0);
      const total = Number(b.totalAmount || 0);
      const discount = Number(b.discount || 0);
      return Math.max(0, total - discount) - paid > 0;
    })
    .sort((a: any, b: any) => {
      const da = new Date(a.serviceDate || a.createdAt || 0).getTime();
      const db = new Date(b.serviceDate || b.createdAt || 0).getTime();
      return da - db;
    });

  let remaining = amount;
  const previews: BillPreview[] = [];
  let fullyPaidCount = 0;
  let partialCount = 0;
  let unchangedCount = 0;

  for (const bill of sorted) {
    const paid = Number(bill.paidAmount || 0);
    const total = Number(bill.totalAmount || 0);
    const discount = Number(bill.discount || 0);
    const grandTotal = Math.max(0, total - discount);
    const due = Math.max(0, grandTotal - paid);

    if (remaining <= 0) {
      unchangedCount++;
      previews.push({
        id: bill._id,
        billNumber: bill.billNumber || `#${bill._id?.slice(-6)}`,
        due,
        applied: 0,
        status: "unchanged",
      });
      continue;
    }

    const applied = Math.min(remaining, due);
    const newDue = Math.max(0, due - applied);
    const isFullyPaid = newDue <= 0.01;

    if (isFullyPaid) fullyPaidCount++;
    else partialCount++;

    previews.push({
      id: bill._id,
      billNumber: bill.billNumber || `#${bill._id?.slice(-6)}`,
      due,
      applied,
      status: isFullyPaid ? "paid" : "partial",
    });

    remaining -= applied;
  }

  // Bills not in sorted (already paid)
  for (const bill of bills) {
    if (!sorted.find((b: any) => b._id === bill._id)) {
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const discount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - discount);
      const due = Math.max(0, grandTotal - paid);
      if (due <= 0) {
        unchangedCount++;
        previews.push({
          id: bill._id,
          billNumber: bill.billNumber || `#${bill._id?.slice(-6)}`,
          due: 0,
          applied: 0,
          status: "unchanged",
        });
      }
    }
  }

  return {
    previews,
    totalApplied: amount - remaining,
    fullyPaidCount,
    partialCount,
    unchangedCount,
  };
}

export const PayAllBillsModal = memo(function PayAllBillsModal({
  isOpen,
  onClose,
  customer,
  bills,
  onPaid,
}: PayAllBillsModalProps) {
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [customAmountEnabled, setCustomAmountEnabled] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const unpaidBills = useMemo(() => {
    return bills.filter((bill: any) => {
      const status = String(bill.paymentStatus || "").toLowerCase();
      if (status === "paid") return false;
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const discount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - discount);
      return paid < grandTotal;
    });
  }, [bills]);

  const totalPending = useMemo(() => {
    return unpaidBills.reduce((sum: number, bill: any) => {
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const billDiscount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - billDiscount);
      return sum + Math.max(0, grandTotal - paid);
    }, 0);
  }, [unpaidBills]);

  const distribution = useMemo(() => {
    if (!customAmountEnabled) {
      return distributePayment(bills, totalPending);
    }
    return distributePayment(bills, Math.max(0, receivedAmount));
  }, [bills, totalPending, customAmountEnabled, receivedAmount]);

  const overpayment = customAmountEnabled && receivedAmount > totalPending;
  const effectiveAmount = customAmountEnabled
    ? Math.min(Math.max(0, receivedAmount), totalPending)
    : totalPending;

  const handleConfirm = async () => {
    if (unpaidBills.length === 0) return;

    setIsProcessing(true);
    try {
      const billIds = unpaidBills.map((b: any) => b._id);
      const res = await fetch("/api/admin/bills/pay-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?._id,
          billIds,
          paymentMode,
          paymentDate,
          customAmountEnabled,
          receivedAmount: customAmountEnabled ? receivedAmount : totalPending,
          note,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(
          json.error || `Failed to apply payment (${res.status})`,
        );
      }

      setSuccessData(json.data);
      setShowSuccess(true);
      toast.success(
        `Payment adjusted across ${json.data?.updatedCount || 0} bill(s)!`,
      );
      setTimeout(() => {
        onPaid();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("[PayMultiple] error:", err);
      toast.error(err?.message || "Failed to apply payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setPaymentMode("cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setCustomAmountEnabled(false);
    setReceivedAmount(0);
    setNote("");
    setShowSuccess(false);
    setSuccessData(null);
    onClose();
  };

  const cName = customer?.name || "Unknown Customer";

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title={showSuccess ? undefined : "Pay Multiple Bills"}
      size="md"
      zIndex={360}
      showCloseButton={!showSuccess && !isProcessing}
      mobileType="bottom-sheet"
      forceFullSize
    >
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Payment Applied!
          </h2>
          <p className="text-sm text-white/50">
            Adjusted across {successData?.updatedCount || 0} bill(s)
          </p>
          <p className="text-xs text-white/40 mt-2">
            ₹{successData?.totalApplied?.toLocaleString() || 0} applied
          </p>
          {successData?.fullyPaidCount > 0 && (
            <p className="text-xs text-emerald-400 mt-1">
              Fully paid: {successData.fullyPaidBills?.join(", ") || successData.fullyPaidCount + " bill(s)"}
            </p>
          )}
          {successData?.partialCount > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Partially paid: {successData.partialCount} bill(s)
            </p>
          )}
          {successData?.remainingOutstanding > 0 && (
            <p className="text-xs text-white/40 mt-1">
              Remaining outstanding: ₹{successData.remainingOutstanding.toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="glass-card-static p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white/80">
                  {cName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {cName}
                </p>
                {customer?.phone && (
                  <p className="text-[11px] text-white/40">{customer.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Amount Toggle */}
          <div className="glass-card-static p-3">
            <button
              type="button"
              onClick={() => {
                const next = !customAmountEnabled;
                setCustomAmountEnabled(next);
                if (!next) {
                  setReceivedAmount(0);
                }
              }}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-medium text-white">
                Use custom payment amount
              </span>
              {customAmountEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-white/30" />
              )}
            </button>

            {customAmountEnabled && (
              <div className="mt-3">
                <label className="text-[11px] text-white/40 mb-1.5 block">
                  Amount received from customer
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={receivedAmount || ""}
                    onChange={(e) =>
                      setReceivedAmount(
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                    className="w-full glass-input !pl-7 !p-2.5 text-sm text-white"
                    min="0"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                {overpayment && (
                  <div className="flex items-center gap-1.5 mt-2 text-amber-400 text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      Amount exceeds total pending. Will be capped to ₹
                      {totalPending.toLocaleString()}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Distribution Preview */}
          <div className="glass-card-static p-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Payment Summary
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-center">
                <p className="text-[10px] text-emerald-400/70">Fully Paid</p>
                <p className="text-lg font-bold text-emerald-400">
                  {distribution.fullyPaidCount}
                </p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-2 text-center">
                <p className="text-[10px] text-amber-400/70">Partial</p>
                <p className="text-lg font-bold text-amber-400">
                  {distribution.partialCount}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-2 text-center">
                <p className="text-[10px] text-white/40">Unchanged</p>
                <p className="text-lg font-bold text-white/60">
                  {distribution.unchangedCount}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">
                {customAmountEnabled ? "Received" : "Total Pending"}
              </span>
              <span className="font-semibold text-white">
                ₹
                {(customAmountEnabled
                  ? receivedAmount
                  : totalPending
                ).toLocaleString()}
              </span>
            </div>
            {customAmountEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Applied</span>
                <span className="font-semibold text-emerald-400">
                  ₹{distribution.totalApplied.toLocaleString()}
                </span>
              </div>
            )}
            {customAmountEnabled && receivedAmount > totalPending && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Unapplied</span>
                <span className="font-semibold text-amber-400">
                  ₹{(receivedAmount - totalPending).toLocaleString()}
                </span>
              </div>
            )}

            {/* Bill preview rows — only in custom (multi-pay) mode */}
            {customAmountEnabled && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {distribution.previews.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-white/60 truncate flex-1">
                      {p.billNumber}
                    </span>
                    <span className="text-white/40 w-16 text-right">
                      ₹{p.due.toLocaleString()}
                    </span>
                    {p.applied > 0 && (
                      <span className="text-emerald-400 w-16 text-right">
                        -₹{p.applied.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={cn(
                        "w-14 text-right font-medium",
                        p.status === "paid"
                          ? "text-emerald-400"
                          : p.status === "partial"
                            ? "text-amber-400"
                            : "text-white/30",
                      )}
                    >
                      {p.status === "paid"
                        ? "Paid"
                        : p.status === "partial"
                          ? "Partial"
                          : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Mode */}
          <div className="glass-card-static p-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">Payment Mode</h3>
            <div className="grid grid-cols-3 gap-2">
              {paymentModes.map((mode) => {
                const ModeIcon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setPaymentMode(mode.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all",
                      paymentMode === mode.value
                        ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                        : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06]",
                    )}
                  >
                    <ModeIcon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div className="glass-card-static p-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">Payment Date</h3>
            <AppDateTimePicker
              mode="date"
              value={paymentDate}
              onChange={setPaymentDate}
              placeholder="Select payment date"
            />
          </div>

          {/* Note */}
          <div className="glass-card-static p-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Note <span className="text-white/30 font-normal">(optional)</span>
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full glass-input !p-2.5 text-sm text-white resize-none"
              placeholder="Add a note..."
            />
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={
              isProcessing ||
              unpaidBills.length === 0 ||
              (customAmountEnabled && receivedAmount <= 0)
            }
            className="w-full !rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0 py-5 text-sm font-semibold"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {isProcessing
              ? "Processing..."
              : `Apply ₹${effectiveAmount.toLocaleString()} Payment`}
          </Button>
        </div>
      )}
    </BaseGlassModal>
  );
});
