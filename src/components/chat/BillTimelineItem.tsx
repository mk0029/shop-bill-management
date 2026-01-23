"use client";

import React, { useCallback } from "react";
import { BillDetailTrigger } from "../bills/bill-detail-trigger";

type LiteBill = {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  createdAt: string;
  paymentStatus?: string;
  status?: string;
  paidAmount?: number;
  balanceAmount?: number;
};

type Props = {
  bill: LiteBill;
  actor: "admin" | "customer";
};

export default function BillTimelineItem({ bill, actor }: Props) {
  const getBillStatus = useCallback((b: LiteBill): string => {
    const stored = (b.paymentStatus || b.status || "").toLowerCase();
    if (stored) {
      if (stored === "draft") return "pending";
      return stored;
    }
    const total = Number(b.totalAmount || 0);
    const paid = Number(b.paidAmount || 0);
    const bal =
      b.balanceAmount != null ? Number(b.balanceAmount) : total - paid;
    if (Number.isFinite(bal)) {
      if (bal <= 0) return "paid";
      if (bal > 0 && paid > 0) return "partial";
      return "pending";
    }
    if (total > 0 && paid >= total) return "paid";
    if (paid > 0 && paid < total) return "partial";
    return "pending";
  }, []);

  const getBillStatusClasses = useCallback(
    (b: LiteBill) => {
      const raw = getBillStatus(b);
      if (raw === "paid") {
        return {
          container:
            "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700",
          textMuted: "text-emerald-700 dark:text-emerald-300",
          button:
            "border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white",
          title: "text-emerald-900 dark:text-emerald-200",
          badge: "bg-emerald-600 text-white",
          badgeText: "PAID",
        } as const;
      }
      if (raw === "partial") {
        return {
          container:
            "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
          textMuted: "text-orange-700 dark:text-orange-300",
          button:
            "border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-600 hover:text-white",
          title: "text-orange-900 dark:text-orange-200",
          badge: "bg-orange-500 text-white",
          badgeText: "PARTIAL",
        } as const;
      }
      if (raw === "pending") {
        return {
          container:
            "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700",
          textMuted: "text-yellow-700 dark:text-yellow-300",
          button:
            "border-yellow-500 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-600 hover:text-white",
          title: "text-yellow-900 dark:text-yellow-200",
          badge: "bg-yellow-500 text-black",
          badgeText: "PENDING",
        } as const;
      }
      if (raw === "due" || raw === "overdue") {
        return {
          container:
            "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
          textMuted: "text-red-700 dark:text-red-300",
          button:
            "border-red-500 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white",
          title: "text-red-900 dark:text-red-200",
          badge: "bg-red-600 text-white",
          badgeText: "DUE",
        } as const;
      }
      return {
        container:
          "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
        textMuted: "text-zinc-500 dark:text-zinc-400",
        button:
          "border-zinc-400 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-700 hover:text-white",
        title: "text-zinc-900 dark:text-zinc-100",
        badge: "bg-zinc-600 text-white",
        badgeText: "BILL",
      } as const;
    },
    [getBillStatus],
  );

  const status = getBillStatus(bill);
  const billCls = getBillStatusClasses(bill);
  const total = Number(bill.totalAmount ?? 0);
  const paid = Number(bill.paidAmount ?? 0);
  const due = Number(
    bill.balanceAmount != null ? bill.balanceAmount : Math.max(0, total - paid),
  );
  const buttonLabel =
    actor === "admin"
      ? status === "paid"
        ? "View"
        : "Update"
      : status === "paid"
        ? "View"
        : "Pay Now";

  return (
    <div className="flex justify-start w-full">
      <div
        className={`max-w-[90%] md:max-w-[80%] border rounded-md p-3 ${billCls.container}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className={`text-sm font-semibold ${billCls.title}`}>
              Bill Created of ₹
              {Number(bill.totalAmount ?? 0).toLocaleString("en-IN")}
            </div>
            <div className={`text-xs ${billCls.textMuted}`}>
              {new Date(bill.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </div>
            {status === "partial" && (
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="font-medium text-emerald-600 dark:text-emerald-300">
                  Paid ₹{paid.toLocaleString("en-IN")}
                </span>
                <span className="opacity-50">•</span>
                <span className="font-medium text-orange-600 dark:text-orange-300">
                  Due ₹{due.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {status === "pending" && due > 0 && (
              <div className="mt-1 text-[9px] md:text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                Pending ₹{due.toLocaleString("en-IN")}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <BillDetailTrigger
              bill={bill}
              buttonLabel={buttonLabel}
              variant="outline"
              size="sm"
              className={`h-8 ${billCls.button}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
