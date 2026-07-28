"use client";

import { useState, useMemo } from "react";
import { Check, Loader2, Sparkles, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { toast } from "sonner";
import { toMoney } from "@/lib/customer-advance";

const SKIP_PREFIX = "advance_adjust_skip_";

interface AdvanceAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  unpaidBills: any[];
  onPaid: () => void;
  onSkip?: () => void;
}

export function AdvanceAdjustModal({
  isOpen,
  onClose,
  customer,
  unpaidBills,
  onPaid,
  onSkip,
}: AdvanceAdjustModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appliedAmount, setAppliedAmount] = useState(0);

  const advanceBalance = toMoney(customer?.advanceBalance ?? 0);
  const totalPending = useMemo(() => {
    return unpaidBills.reduce((sum: number, bill: any) => {
      const paid = Number(bill.paidAmount || 0);
      const total = Number(bill.totalAmount || 0);
      const discount = Number(bill.discount || 0);
      const grandTotal = Math.max(0, total - discount);
      return sum + Math.max(0, grandTotal - paid);
    }, 0);
  }, [unpaidBills]);

  const cName = customer?.name || "Unknown Customer";

  const handleSkip = () => {
    try {
      localStorage.setItem(SKIP_PREFIX + customer._id, "true");
    } catch {}
    onSkip?.();
    onClose();
  };

  const handleAdjust = async () => {
    if (unpaidBills.length === 0 || advanceBalance <= 0) return;

    setIsProcessing(true);
    try {
      const billIds = unpaidBills.map((b: any) => b._id);
      const res = await fetch("/api/admin/bills/pay-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer._id,
          billIds,
          paymentMode: "cash",
          paymentDate: new Date().toISOString().split("T")[0],
          customAmountEnabled: true,
          receivedAmount: 0,
          note: "Auto-adjusted from advance balance",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(
          json.error || `Failed to apply advance (${res.status})`,
        );
      }

      const totalApplied = json.data?.totalApplied ?? Math.min(advanceBalance, totalPending);
      setAppliedAmount(totalApplied);
      setShowSuccess(true);
      toast.success(
        `₹${totalApplied.toLocaleString()} advance applied across ${json.data?.updatedCount || 0} bill(s)!`,
      );
      setTimeout(() => {
        onPaid();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("[AdvanceAdjust] error:", err);
      toast.error(
        err?.message || "Failed to adjust advance. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={isProcessing ? undefined : onClose}
      title={showSuccess ? undefined : "Advance Balance Available"}
      size="sm"
      zIndex={350}
      showCloseButton={!showSuccess && !isProcessing}>
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Advance Applied!
          </h2>
          <p className="text-sm text-white/50">
            ₹{appliedAmount.toLocaleString()} adjusted
            across {unpaidBills.length} bill(s)
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Customer Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center shrink-0">
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
              <p className="text-sm font-medium text-white truncate">{cName}</p>
              {customer?.phone && (
                <p className="text-[11px] text-white/40">{customer.phone}</p>
              )}
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400/70 mb-1">
                Advance Balance
              </p>
              <p className="text-lg font-bold text-emerald-400">
                ₹{advanceBalance.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400/70 mb-1">Total Pending</p>
              <p className="text-lg font-bold text-amber-400">
                ₹{totalPending.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <p className="text-sm text-white/70">
              This customer has an advance balance of{" "}
              <span className="text-emerald-400 font-medium">
                ₹{advanceBalance.toLocaleString()}
              </span>{" "}
              and{" "}
              <span className="text-amber-400 font-medium">
                {unpaidBills.length}
              </span>{" "}
              unpaid bill(s). Would you like to apply this advance?
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleSkip}
              disabled={isProcessing}>
              <SkipForward className="w-4 h-4" />
              Skip
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
              onClick={handleAdjust}
              disabled={isProcessing || unpaidBills.length === 0}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isProcessing ? "Applying..." : "Adjust"}
            </Button>
          </div>
        </div>
      )}
    </BaseGlassModal>
  );
}

export function isAdvanceSkipped(customerId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SKIP_PREFIX + customerId) === "true";
  } catch {
    return false;
  }
}

export function resetAdvanceSkip(customerId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SKIP_PREFIX + customerId);
  } catch {}
}
