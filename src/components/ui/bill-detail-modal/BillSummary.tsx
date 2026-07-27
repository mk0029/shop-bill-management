"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

interface BillSummaryProps {
  bill: any;
  currency?: string;
}

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const BillSummary = memo(function BillSummary({
  bill,
  currency = "₹",
}: BillSummaryProps) {
  const itemsTotal = useMemo(
    () =>
      bill.items?.reduce(
        (t: number, i: any) => t + (i.totalPrice || i.total || 0),
        0,
      ) || 0,
    [bill.items],
  );

  const transportationFee = toNum(bill.transportationFee);
  const visitingCharges = toNum(bill.visitingCharges);
  const repairCharge = toNum(
    bill.repairCharges ?? bill.repairFee ?? bill.repairCharge ?? 0,
  );
  const additionalTotal = transportationFee + visitingCharges + repairCharge;

  const explicitTotal = toNum(bill.totalAmount ?? bill.total);
  const grandTotal =
    explicitTotal > 0 ? explicitTotal : itemsTotal + additionalTotal;

  const discount = toNum(
    bill.discount ?? bill.discountAmount ?? bill.customerDiscount ?? 0,
  );
  const tax = toNum(bill.taxAmount ?? bill.tax ?? 0);
  const paid = toNum(bill.paidAmount ?? 0);
  const advanceApplied = toNum(bill.advanceApplied ?? 0);
  const advanceCreated = toNum(bill.advanceCreated ?? 0);
  const netPayable = Math.max(0, grandTotal - discount - paid - advanceApplied);
  const remaining = Math.max(0, grandTotal - discount - paid + advanceCreated - advanceApplied);

  const rows = useMemo(
    () => [
      { label: "Subtotal", value: itemsTotal, highlight: false },
      ...(additionalTotal > 0
        ? [
            {
              label: "Additional Charges",
              value: additionalTotal,
              highlight: false,
            },
          ]
        : []),
      ...(discount > 0
        ? [
            {
              label: "Discount",
              value: -discount,
              highlight: false,
              negative: true,
            },
          ]
        : []),
      ...(tax > 0 ? [{ label: "Tax", value: tax, highlight: false }] : []),
      { label: "Grand Total", value: grandTotal, highlight: true, bold: true },
      ...(advanceApplied > 0
        ? [
            {
              label: "Advance Applied",
              value: -advanceApplied,
              highlight: false,
              green: true,
            },
          ]
        : []),
      ...(advanceCreated > 0
        ? [
            {
              label: "Advance Created",
              value: advanceCreated,
              highlight: false,
              accent: true,
            },
          ]
        : []),
      ...(paid > 0
        ? [
            {
              label: "Paid Amount",
              value: -paid,
              highlight: false,
              green: true,
            },
          ]
        : []),
      ...(remaining > 0
        ? [
            {
              label: "Remaining Amount",
              value: remaining,
              highlight: true,
            },
          ]
        : []),
      {
        label: "Net Payable",
        value: netPayable,
        highlight: true,
        bold: true,
        large: true,
        accent: netPayable > 0,
      },
    ],
    [
      itemsTotal,
      additionalTotal,
      discount,
      tax,
      grandTotal,
      paid,
      advanceApplied,
      advanceCreated,
      remaining,
      netPayable,
    ],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <GlassCardHeader title="Bill Summary" />
        <div className=" px-3 sm:px-5 md:px-6 pb-6">
          <div className="space-y-0">
            {rows.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.3 }}
              >
                <div
                  className={cn(
                    "flex items-center justify-between py-2.5",
                    i < rows.length - 1 && "border-b border-white/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {i > 0 && (
                      <ChevronDown className="w-3 h-3 text-white/15 -rotate-90 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        row.bold
                          ? "font-semibold text-white/90"
                          : "text-white/50",
                      )}
                    >
                      {row.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "tabular-nums",
                      row.large && "text-lg sm:text-xl",
                      row.bold && "font-bold",
                      row.highlight && row.accent
                        ? "text-amber-300"
                        : row.green
                          ? "text-emerald-400"
                          : row.negative
                            ? "text-rose-400"
                            : "text-white/80",
                      row.large && row.accent && "text-amber-300",
                    )}
                  >
                    {currency}
                    {Math.abs(row.value).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});
