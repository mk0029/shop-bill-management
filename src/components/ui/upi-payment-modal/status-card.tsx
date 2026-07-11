"use client";

import { Clock, Info } from "lucide-react";
import { formatIndianRupee, safeParseAmount } from "@/lib/upi-utils";
import type { BillData } from "./types";

interface Props {
  bill: BillData;
  billReference: string;
}

export function StatusCard({ bill, billReference }: Props) {
  const amount = safeParseAmount(bill.totalAmount);
  const balance = safeParseAmount(bill.balanceAmount);
  const paid = safeParseAmount(bill.paidAmount);
  const isPartial = paid > 0 && balance > 0;

  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            Pending Payment Verification
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            Ref: {billReference}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.04]">
          <span className="text-xs text-gray-400">Amount to Pay</span>
          <span className="text-sm font-semibold text-white">
            {formatIndianRupee(isPartial ? balance : amount)}
          </span>
        </div>

        {isPartial && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.04]">
            <span className="text-xs text-gray-400">Total Bill</span>
            <span className="text-sm text-gray-300">
              {formatIndianRupee(amount)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03]">
        <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          After completing your payment, contact the administrator. Your bill
          will be marked as paid once the payment is verified.
        </p>
      </div>
    </div>
  );
}
