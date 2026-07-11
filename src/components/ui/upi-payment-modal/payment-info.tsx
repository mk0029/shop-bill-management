"use client";

import { FileText, Check, Copy } from "lucide-react";
import { formatIndianRupee, safeParseAmount } from "@/lib/upi-utils";
import type { BillData } from "./types";

interface Props {
  bill: BillData;
  merchantName: string;
  merchantUpiId: string;
  billReference: string;
  copyStates: Record<string, boolean>;
  onCopy: (label: string, text: string) => void;
}

const Row = ({
  label,
  value,
  copyKey,
  copyStates = {},
  onCopy = () => {},
  mono,
  accent,
}: {
  label: string;
  value: string;
  copyKey?: string;
  copyStates?: Record<string, boolean>;
  onCopy?: (label: string, text: string) => void;
  mono?: boolean;
  accent?: boolean;
}) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider shrink-0 w-20">
        {label}
      </span>
      <span
        className={`text-sm truncate ${
          accent
            ? "text-purple-300 font-semibold"
            : mono
              ? "text-gray-200 font-mono"
              : "text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
    {copyKey && (
      <button
        onClick={() => onCopy(copyKey, value)}
        className="shrink-0 ml-2 p-1.5 rounded-lg hover:bg-white/[0.08] transition-all active:scale-90"
        aria-label={`Copy ${label}`}
      >
        {copyStates?.[copyKey] ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
        )}
      </button>
    )}
  </div>
);

export function PaymentInfo({ bill, merchantName, merchantUpiId, billReference, copyStates, onCopy }: Props) {
  const amount = safeParseAmount(bill.totalAmount);
  const today = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        Payment Details
      </h3>
      <Row label="Merchant" value={merchantName} />
      <Row
        label="UPI ID"
        value={merchantUpiId}
        copyKey="upi-id"
        copyStates={copyStates}
        onCopy={onCopy}
        mono
      />
      <Row label="Bill No" value={bill.billNumber} mono />
      <Row
        label="Reference"
        value={billReference}
        copyKey="reference"
        copyStates={copyStates}
        onCopy={onCopy}
        accent
      />
      <Row
        label="Amount"
        value={formatIndianRupee(amount)}
        copyKey="amount"
        copyStates={copyStates}
        onCopy={onCopy}
      />
      <Row label="Currency" value="INR" />
      <Row label="Date" value={today} />
      {bill.customerName && (
        <Row label="Customer" value={`${bill.customerName}${bill.customerPhone ? ` · ${bill.customerPhone}` : ""}`} />
      )}
    </div>
  );
}
