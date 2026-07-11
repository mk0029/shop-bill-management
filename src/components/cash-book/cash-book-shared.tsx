"use client";

import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Check,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from "lucide-react";

export interface AppliedBill {
  billNumber?: string;
  appliedAmount?: number;
  status?: string;
  billRef?: { _id: string; billNumber: string } | null;
}

export interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: { _id: string; name: string; phone?: string; email?: string };
  userName: string;
  amount: number;
  type: "credit" | "debit";
  source: "Manual" | "Bill Payment" | "Inventory" | "Sale";
  bill?: { _id: string; billNumber: string; customer?: { _id: string; name: string } };
  appliedBills?: AppliedBill[];
  billCount?: number;
  fullyPaidCount?: number;
  partialCount?: number;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerGroup {
  key: string;
  customerName: string;
  type: "credit" | "debit";
  source: string;
  entries: CashBookEntry[];
  totalAmount: number;
  latestTime: string;
}

export function BillExpandableRow({ bills, formatCurrency }: { bills: AppliedBill[]; formatCurrency: (v: number) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-2 py-1 rounded-md transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
        {bills.length} bill{bills.length > 1 ? "s" : ""}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 pl-3 border-l-2 border-blue-500/20">
              {bills.map((b, idx) => {
                const bn = b.billNumber || b.billRef?.billNumber || `#${idx + 1}`;
                const amt = b.appliedAmount || 0;
                const paid = b.status === "paid" || b.status === "Paid";
                return (
                  <div key={idx} className="flex items-center justify-between py-1 px-1 rounded hover:bg-white/[0.03]">
                    <div className="flex items-center gap-1.5">
                      {paid ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      <span className="text-[12px] text-white/70 font-medium">{bn}</span>
                    </div>
                    <span className="text-[12px] text-white/50">₹{amt.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CashbookPaymentRow({ entry, formatCurrency, onViewBill, showPhone }: {
  entry: CashBookEntry;
  formatCurrency: (v: number) => string;
  onViewBill: (id: string) => void;
  showPhone?: boolean;
}) {
  const isBillPayment = entry.source === "Bill Payment";
  const bills = entry.appliedBills || [];
  const hasBills = bills.length > 0;
  return (
    <div className="mx-3 sm:mx-4 px-3 sm:px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-white/45 font-mono">
              {format(new Date(entry.createdAt), "hh:mm a")}
            </span>
            {entry.source !== "Bill Payment" && (
              <span className="text-[10px] text-gray-500 bg-white/[0.03] px-1.5 py-0.5 rounded">{entry.source}</span>
            )}
            {showPhone && entry.user?.phone && (
              <span className="text-[10px] text-gray-500">{entry.user.phone}</span>
            )}
          </div>
          {hasBills && (
            <div className="mt-1.5">
              <BillExpandableRow bills={bills} formatCurrency={formatCurrency} />
            </div>
          )}
          {isBillPayment && !hasBills && entry.bill && (
            <button type="button" onClick={() => onViewBill(entry.bill?._id || "")}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1.5 transition-colors">
              <Receipt className="w-3 h-3" /> {entry.bill.billNumber || "View Bill"}
            </button>
          )}
          {entry.notes && (
            <p className="text-[11px] text-white/25 mt-1 truncate">{entry.notes}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-sm sm:text-base font-bold ${entry.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
            {entry.type === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CashbookCustomerGroupCard({ group, formatCurrency, onViewBill, showPhone }: {
  group: CustomerGroup;
  formatCurrency: (v: number) => string;
  onViewBill: (id: string) => void;
  showPhone?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border transition-all duration-200 select-none ${
        expanded
          ? "border-white/[0.12] bg-white/[0.05] shadow-lg shadow-black/20"
          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.09] hover:shadow-md hover:shadow-black/10"
      }`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 cursor-pointer transition-colors rounded-xl"
      >
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
          group.type === "credit" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        }`}>
          {group.type === "credit" ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm sm:text-base font-semibold text-white truncate max-w-[150px] sm:max-w-none">{group.customerName}</p>
            {showPhone && group.entries[0]?.user?.phone && (
              <span className="text-[10px] text-gray-500">{group.entries[0].user.phone}</span>
            )}
            <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium ${
              group.type === "credit" ? "bg-emerald-900/30 text-emerald-300" : "bg-red-900/30 text-red-300"
            }`}>{group.type === "credit" ? "Credit" : "Debit"}</span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 bg-white/[0.04] px-1.5 sm:px-2 py-0.5 rounded-md">
              {group.entries.length} payment{group.entries.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold text-white">{formatCurrency(group.totalAmount)}</span>
            <span className="text-[11px] text-white/40">Latest &bull; {group.latestTime}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-center w-8 h-8">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-white/50" />
          </motion.span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-4 sm:mx-5 border-t border-white/[0.08]" />
            <div className="py-2">
              {group.entries.map((entry) => (
                <CashbookPaymentRow
                  key={entry._id}
                  entry={entry}
                  formatCurrency={formatCurrency}
                  onViewBill={onViewBill}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function groupEntriesByDateAndCustomer(entries: CashBookEntry[]) {
  const dateMap: { [date: string]: { [groupKey: string]: CashBookEntry[] } } = {};
  entries.forEach((entry) => {
    const date = format(new Date(entry.createdAt), "yyyy-MM-dd");
    if (!dateMap[date]) dateMap[date] = {};
    const groupKey = `${entry.userName}|${entry.type}|${entry.source}`;
    if (!dateMap[date][groupKey]) dateMap[date][groupKey] = [];
    dateMap[date][groupKey].push(entry);
  });

  const result: { date: string; groups: CustomerGroup[] }[] = [];
  for (const [date, groupMap] of Object.entries(dateMap)) {
    const groups: CustomerGroup[] = Object.entries(groupMap).map(([key, entries]) => {
      const sorted = [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const totalAmount = sorted.reduce((sum, e) => sum + e.amount, 0);
      const latestTime = format(new Date(sorted[0].createdAt), "hh:mm a");
      return {
        key,
        customerName: sorted[0].userName,
        type: sorted[0].type,
        source: sorted[0].source,
        entries: sorted,
        totalAmount,
        latestTime,
      };
    });
    result.push({ date, groups });
  }
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
