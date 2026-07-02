/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayAllBillsModal } from "./pay-all-bills-modal";

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
  const [showPayAllModal, setShowPayAllModal] = useState(false);

  const filteredBills = useMemo(() => {
    if (!groupFilter) return group.bills;
    return group.bills.filter(
      (bill: any) => (bill.paymentStatus || bill.status) === groupFilter,
    );
  }, [group.bills, groupFilter]);

  const stats = useMemo(() => {
    let pending = 0;
    let paid = 0;
    const totalBills = group.bills.length;

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
        pending +=
          bill.balanceAmount != null
            ? Number(bill.balanceAmount)
            : Math.max(0, amount - discount - netPaid);
      } else {
        pending +=
          bill.balanceAmount != null
            ? Number(bill.balanceAmount)
            : Math.max(0, amount - discount);
      }
    });

    return { pending, paid, totalBills };
  }, [group.bills]);

  const customerName =
    group.customer?.name?.replace(
      /\s*\([^)]*\)|\s*\[[^\]]*\]|\s*\{[^}]*\}/g,
      "",
    ) || "Unknown Customer";

  const phone = group.customer?.phone || "";
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl overflow-hidden">
      {/* Header — clickable */}
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer select-none active:bg-white/[0.04] transition-colors"
      >
        {/* Row 1: Name + icons + bills count + chevron */}
        <div className="flex items-center  justify-between gap-2">
          <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 justify-between">
            <h3 className="min-w-0 max-w-[180px] truncate text-[15px] font-semibold text-white sm:max-w-none sm:text-base">
              {customerName}
            </h3>

            {phone && (
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`https://wa.me/91${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Chat on WhatsApp"
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/75 backdrop-blur-xl transition active:scale-95 hover:bg-white/[0.12]"
                >
                  <MessageSquare size={15} />
                </a>
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Call customer"
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/75 backdrop-blur-xl transition active:scale-95 hover:bg-white/[0.12]"
                >
                  <Phone size={15} />
                </a>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 text-xs text-white/55">
            <span>
              <span className="font-semibold text-sm">
                {" "}
                {stats.totalBills}{" "}
              </span>{" "}
              bill
              {stats.totalBills !== 1 ? "s" : ""}
            </span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown size={14} />
            </motion.span>
          </div>
        </div>

        {/* Row 2: Stats + Pay All */}
        <div
          className={`${stats.pending !== 0 ? "mt-3" : "mt-1"} flex flex-wrap items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-3 text-sm sm:gap-4 sm:text-sm">
            {stats.pending !== 0 && (
              <span>
                <span className="text-white/50">Pending</span>{" "}
                <span className="font-bold tracking-wide text-amber-300">
                  ₹{stats.pending.toLocaleString()}
                </span>
              </span>
            )}
            {stats.pending === 0 && (
              <span>
                <span
                  className={`${stats.pending !== 0 ? "text-white/50" : "font-bold tracking-wide text-emerald-300"}`}
                >
                  {stats.pending !== 0 ? "" : "All "}Paid
                </span>{" "}
                {/* <span className="font-bold tracking-wide text-emerald-300">
                {stats.pending !== 0 && ` ₹${stats.paid.toLocaleString()}`}
              </span> */}
              </span>
            )}
          </div>

          {stats.pending > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPayAllModal(true);
              }}
              className="h-6 shrink-0 rounded-full bg-emerald-500/90 px-4 text-xs font-semibold text-white transition active:scale-95 hover:bg-emerald-400 sm:h-[34px] sm:px-5"
            >
               Pay Bills
            </button>
          )}
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
            <div className="px-3 pb-3 space-y-2">
              {/* Filter buttons */}
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
                        : "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="text-[11px] text-white/30 ml-auto">
                  {filteredBills.length} / {group.bills.length}
                </span>
              </div>

              {/* Bill cards */}
              <div className="max-h-[70dvh] overflow-y-auto space-y-2 pr-1">
                {filteredBills.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">
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
                        className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        onClick={() => onBillClick?.(bill)}
                        role="button"
                        aria-label={`View details for bill ${bill.billNumber}`}
                      >
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                  {bill.billNumber || `#${bill._id?.slice(-6)}`}
                                </span>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 ${getStatusColor(status)}`}
                                >
                                  {status}
                                </Badge>
                              </div>
                              <p className="text-xs text-white/40 mt-0.5">
                                {(bill.serviceType || "Service").replace(
                                  /_/g,
                                  " ",
                                )}
                                {bill.technician?.name
                                  ? ` · ${bill.technician.name}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-white">
                                ₹{total.toLocaleString()}
                              </p>
                              {discount > 0 && (
                                <p className="text-[10px] text-blue-400">
                                  -₹{discount.toLocaleString()}
                                </p>
                              )}
                              {(status === "partial" || status === "paid") &&
                                netPaid > 0 && (
                                  <p className="text-[10px] text-emerald-400">
                                    ₹{netPaid.toLocaleString()} paid
                                  </p>
                                )}
                              {status !== "paid" && balance > 0 && (
                                <p className="text-[10px] text-amber-400">
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

      <PayAllBillsModal
        isOpen={showPayAllModal}
        onClose={() => setShowPayAllModal(false)}
        customer={group.customer}
        bills={group.bills}
        onPaid={() => {}}
      />
    </div>
  );
}
