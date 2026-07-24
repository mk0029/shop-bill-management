"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CashBookEntry } from "./cash-book-shared";

interface Props {
  entry: CashBookEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    entryId: string;
    paymentAmount: number;
    paymentMethod: string;
    note: string;
  }) => Promise<void>;
  formatCurrency: (v: number) => string;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export function PayPendingModal({
  entry,
  isOpen,
  onClose,
  onSubmit,
  formatCurrency,
}: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pending = Number(entry?.pendingAmount) || 0;
  const payAmount = Number(amount) || 0;
  const remaining = pending - payAmount;

  const isValid = payAmount > 0 && payAmount <= pending;

  const handlePayFull = () => {
    setAmount(String(pending));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        entryId: entry._id,
        paymentAmount: payAmount,
        paymentMethod: method,
        note: note.trim(),
      });
      setAmount("");
      setNote("");
      setMethod("cash");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay Pending Amount"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">
              Pending Amount
            </span>
            <span className="text-sm font-bold text-amber-300">
              {formatCurrency(pending)}
            </span>
          </div>
          {entry.customerName && (
            <p className="text-[11px] text-amber-400/60 mt-1">
              {entry.customerName}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-gray-300 text-sm">Payment Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
              ₹
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={pending}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-6"
              disabled={submitting}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={handlePayFull}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Pay full ({formatCurrency(pending)})
          </button>
        </div>

        {payAmount > 0 && (
          <div className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-gray-400">Paying</span>
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(payAmount)}
            </span>
            {remaining > 0 && (
              <>
                <span className="text-gray-400">Remaining</span>
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(remaining)}
                </span>
              </>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-gray-300 text-sm">Payment Method</Label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setMethod(pm.value)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  method === pm.value
                    ? "bg-cyan-600 text-white ring-1 ring-cyan-500/30"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-gray-300 text-sm">Note (optional)</Label>
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. partial payment received"
            className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className={`flex-1 ${!isValid || submitting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {submitting ? "Processing..." : "Confirm Payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
