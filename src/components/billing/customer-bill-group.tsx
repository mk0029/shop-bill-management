/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomerGroup {
  id: string;
  customer: {
    _id?: string;
    name?: string;
    phone?: string;
  };
  bills: any[];
}

interface CustomerBillGroupProps {
  group: CustomerGroup;
  onBillClick?: (bill: any) => void;
  open: boolean;
  onToggle: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-900 text-green-300";
    case "pending":
      return "bg-yellow-900 text-yellow-300";
    case "overdue":
      return "bg-red-900 text-red-300";
    case "partial":
      return "bg-orange-900 text-orange-300";
    default:
      return "bg-gray-900 text-gray-300";
  }
}

export default function CustomerBillGroup({
  group,
  onBillClick,
  open,
  onToggle,
}: CustomerBillGroupProps) {
  const [groupFilter, setGroupFilter] = useState("");
  const filteredBills = useMemo(() => {
    if (!groupFilter) return group.bills;
    return group.bills.filter(
      (bill: any) =>
        (bill.paymentStatus || bill.status) === groupFilter,
    );
  }, [group.bills, groupFilter]);

  const stats = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let totalBills = group.bills.length;

    group.bills.forEach((bill: any) => {
      const status = bill.paymentStatus || bill.status;
      const amount = Number(bill.totalAmount ?? 0);
      const paidAmt = Number(bill.paidAmount ?? 0);
      const discount = Number(bill.discount ?? 0);
      const netPaid = Math.max(0, paidAmt - discount);
      if (status === "paid") {
        paid += netPaid;
      } else if (status === "partial") {
        paid += netPaid;
        pending += bill.balanceAmount != null
          ? Number(bill.balanceAmount)
          : Math.max(0, amount - discount - netPaid);
      } else {
        pending += bill.balanceAmount != null
          ? Number(bill.balanceAmount)
          : Math.max(0, amount - discount);
      }
    });

    return { pending, paid, totalBills };
  }, [group.bills]);

  return (
    <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
      {/* Header / Summary */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer select-none hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white truncate">
              {group.customer?.name?.replace(
                /\s*\([^)]*\)|\s*\[[^\]]*\]|\s*\{[^}]*\}/g,
                "",
              ) || "Unknown Customer"}
            </h3>
            {group.customer?.phone && (
              <p className="text-xs text-gray-400 truncate">
                {group.customer.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-400">Pending</p>
            <p className="text-sm font-semibold text-orange-400">
              ₹{stats.pending.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Paid</p>
            <p className="text-sm font-semibold text-green-400">
              ₹{stats.paid.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Bills</p>
            <p className="text-sm font-semibold text-white">
              {stats.totalBills}
            </p>
          </div>
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="group-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
              {/* Group-level filter buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[
                  { value: "", label: "All" },
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" },
                  { value: "partial", label: "Partial" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupFilter(opt.value);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-full border ${
                      groupFilter === opt.value
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="text-[11px] text-gray-500 ml-auto">
                  {filteredBills.length} / {group.bills.length}
                </span>
              </div>

              <div className="max-h-[70dvh] overflow-y-auto space-y-2 pr-1">
                {filteredBills.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No bills match this filter
                  </p>
                ) : (
                  filteredBills.map((bill: any) => {
                    const status = bill.paymentStatus || bill.status;
                    const total = Number(bill.totalAmount ?? 0);
                    const discount = Number(bill.discount ?? 0);
                    const paidAmount = Number(bill.paidAmount ?? 0);
                    const netPaid = Math.max(0, paidAmount - discount);
                    const balance =
                      bill.balanceAmount != null
                        ? Number(bill.balanceAmount)
                        : Math.max(0, total - discount - netPaid);

                    return (
                      <Card
                        key={bill._id}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                        onClick={() => onBillClick?.(bill)}
                        role="button"
                        aria-label={`View details for bill ${bill.billNumber}`}
                      >
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                  {bill.billNumber || `#${bill._id?.slice(-6)}`}
                                </span>
                                <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(status)}`}>
                                  {status}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {(bill.serviceType || "Service").replace(/_/g, " ")}
                                {bill.technician?.name ? ` • ${bill.technician.name}` : ""}
                              </p>
                              <p className="text-xs text-gray-500">
                                {bill.serviceDate
                                  ? new Date(bill.serviceDate).toLocaleDateString()
                                  : new Date(bill.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-white">
                                ₹{total.toLocaleString()}
                              </p>
                              {discount > 0 && (
                                <p className="text-[10px] text-blue-400">
                                  -₹{discount.toLocaleString()} discount
                                </p>
                              )}
                              {(status === "partial" || status === "paid") && netPaid > 0 && (
                                <p className="text-[10px] text-green-400">
                                  ₹{netPaid.toLocaleString()} paid
                                </p>
                              )}
                              {status !== "paid" && balance > 0 && (
                                <p className="text-[10px] text-orange-400">
                                  ₹{balance.toLocaleString()} due
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
