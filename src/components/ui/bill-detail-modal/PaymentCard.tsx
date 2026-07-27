"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaymentCardProps {
  bill: any;
  currency?: string;
  role?: "admin" | "customer";
  onOpenPaymentModal?: () => void;
  onPayOnline?: (bill: any) => void;
  onUPIPayment?: (bill: any) => void;
}

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const PaymentCard = memo(function PaymentCard({
  bill,
  currency = "₹",
  role = "admin",
  onOpenPaymentModal,
  onPayOnline,
  onUPIPayment,
}: PaymentCardProps) {
  const grandTotal = toNum(bill.totalAmount ?? bill.total ?? 0);
  const paidAmount = toNum(bill.paidAmount ?? 0);
  const discount = toNum(bill.discount ?? 0);
  const effectiveTotal = Math.max(0, grandTotal - discount);
  const remaining = Math.max(0, effectiveTotal - paidAmount);
  const progressPct =
    effectiveTotal > 0 ? (paidAmount / effectiveTotal) * 100 : 0;

  const paymentStatus = bill.paymentStatus?.toLowerCase() || "pending";

  const statusBadge = useMemo(() => {
    const config = {
      paid: {
        bg: "bg-emerald-500/15",
        text: "text-emerald-300",
        icon: CheckCircle2,
        label: "Paid",
      },
      partial: {
        bg: "bg-amber-500/15",
        text: "text-amber-300",
        icon: Clock,
        label: "Partially Paid",
      },
      pending: {
        bg: "bg-sky-500/15",
        text: "text-sky-300",
        icon: AlertCircle,
        label: "Pending",
      },
      overdue: {
        bg: "bg-rose-500/15",
        text: "text-rose-300",
        icon: AlertCircle,
        label: "Overdue",
      },
    };
    const c = config[paymentStatus as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm",
          c.bg,
          c.text,
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {c.label}
      </span>
    );
  }, [paymentStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <GlassCardHeader title="Payment" action={statusBadge} />
        <div className=" px-3 sm:px-5 md:px-6 pb-6 space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Payment Progress</span>
              <span className="text-white/60 font-medium">
                {currency}
                {paidAmount.toFixed(2)} / {currency}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DetailCard
              label="Total"
              value={`${currency}${effectiveTotal.toFixed(2)}`}
            />
            <DetailCard
              label="Paid"
              value={`${currency}${paidAmount.toFixed(2)}`}
              color="text-emerald-400"
            />
            <DetailCard
              label="Remaining"
              value={`${currency}${remaining.toFixed(2)}`}
              color={remaining > 0 ? "text-amber-300" : "text-emerald-400"}
            />
            {discount > 0 && (
              <DetailCard
                label="Discount"
                value={`-${currency}${discount.toFixed(2)}`}
                color="text-emerald-400"
              />
            )}
            {Number(bill.advanceApplied) > 0 && (
              <DetailCard
                label="Advance Applied"
                value={`${currency}${Number(bill.advanceApplied).toFixed(2)}`}
                color="text-emerald-400"
              />
            )}
            {Number(bill.advanceCreated) > 0 && (
              <DetailCard
                label="Advance Created"
                value={`+${currency}${Number(bill.advanceCreated).toFixed(2)}`}
                color="text-amber-400"
              />
            )}
            {bill.dueDate && !discount && !Number(bill.advanceApplied) && !Number(bill.advanceCreated) && (
              <DetailCard
                label="Due Date"
                value={new Date(bill.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              />
            )}
          </div>

          {paymentStatus === "partial" && bill.paymentDate && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              <span>
                Last payment:{" "}
                {new Date(bill.paymentDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {role === "admin" && remaining > 0 && onOpenPaymentModal && (
            <div className="space-y-3">
              <div className="glass-divider" />
              <Button
                onClick={onOpenPaymentModal}
                className="w-full !rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 !py-3"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Update Payment
              </Button>
            </div>
          )}

          {role === "customer" && paymentStatus === "paid" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm text-emerald-300/90">
                This bill has been fully paid. Thank you!
              </span>
            </motion.div>
          )}

          {/* {role === "customer" && paymentStatus !== "paid" && onUPIPayment && (
            <div  className="space-y-3">
              <div className="glass-divider" />
              <Button
                onClick={() => onUPIPayment(bill)}
                className="w-full !rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 !py-3"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Pay via UPI
              </Button>
            </div>
          )} */}
        </div>
      </GlassCard>
    </motion.div>
  );
});

function DetailCard({
  label,
  value,
  color = "text-white/80",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-[11px] uppercase tracking-wider text-white/30 font-medium mb-1">
        {label}
      </p>
      <p className={cn("text-sm font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}
