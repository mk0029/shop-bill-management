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
  userName?: string;
  amount: number;
  type: "credit" | "debit";
  source: "Manual" | "Bill Payment" | "Inventory" | "Sale" | "manual" | "bill";
  bill?: {
    _id: string;
    billNumber: string;
    customer?: { _id: string; name: string };
  };
  appliedBills?: AppliedBill[];
  billCount?: number;
  fullyPaidCount?: number;
  partialCount?: number;
  notes?: string;
  category?: string;
  totalAmount?: number;
  pendingAmount?: number;
  receivedAmount?: number;
  customerId?: string | null;
  customerName?: string;
  isCustomName?: boolean;
  status?: "completed" | "partial";
  createdBy?: string;
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
  pendingTotal?: number;
  isCustomName?: boolean;
  customerId?: string | null;
}

export function BillExpandableRow({
  bills,
  formatCurrency,
}: {
  bills: AppliedBill[];
  formatCurrency: (v: number) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-2 py-1 rounded-md transition-colors"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
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
                const bn =
                  b.billNumber || b.billRef?.billNumber || `#${idx + 1}`;
                const amt = b.appliedAmount || 0;
                const paid = b.status === "paid" || b.status === "Paid";
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 px-1 rounded hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-1.5">
                      {paid ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      <span className="text-[12px] text-white/70 font-medium">
                        {bn}
                      </span>
                    </div>
                    <span className="text-[12px] text-white/50">
                      {formatCurrency(amt)}
                    </span>
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

export function CashbookPaymentRow({
  entry,
  formatCurrency,
  onViewBill,
  onPayPending,
}: {
  entry: CashBookEntry;
  formatCurrency: (v: number) => string;
  onViewBill: (id: string) => void;
  onPayPending?: (entry: CashBookEntry) => void;
}) {
  const isBillPayment = entry.source === "Bill Payment";
  const bills = entry.appliedBills || [];
  const hasBills = bills.length > 0;
  const pendingAmt = Number(entry.pendingAmount) || 0;
  const hasPending = pendingAmt > 0;

  return (
    <div className="mx-3 sm:mx-4 px-3 sm:px-4 py-1 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white/80 font-mono">
              {formatISTTime(entry.updatedAt && normalizeToUTC(entry.updatedAt).getTime() > normalizeToUTC(entry.createdAt).getTime() ? entry.updatedAt : entry.createdAt)}
            </span>
            {entry.source !== "Bill Payment" && entry.source !== "manual" && (
              <span className="text-sm text-white/80 bg-white/[0.03] px-1.5 my-0.5 rounded">
                {entry.source}
              </span>
            )}
            {entry.notes && (
              <p className="text-sm text-white/80 truncate max-sm:max-w-[200px]">
                {entry.notes}
              </p>
            )}
          </div>
          {hasPending && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[12px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pending {formatCurrency(pendingAmt)}
              </span>
              {onPayPending && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayPending(entry);
                  }}
                  className="text-[12px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                >
                  Pay
                </button>
              )}
            </div>
          )}
          {hasBills && (
            <div className="mt-1.5">
              <BillExpandableRow
                bills={bills}
                formatCurrency={formatCurrency}
              />
            </div>
          )}
          {isBillPayment && !hasBills && entry.bill && (
            <button
              type="button"
              onClick={() => onViewBill(entry.bill?._id || "")}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1.5 transition-colors"
            >
              <Receipt className="w-3 h-3" />{" "}
              {entry.bill.billNumber || "View Bill"}
            </button>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`text-sm sm:text-base font-bold ${entry.type === "credit" ? "text-emerald-400" : "text-red-400"}`}
          >
            {entry.type === "credit" ? "+" : "-"}
            {formatCurrency(entry.amount)}
          </span>
          {hasPending && (
            <span className="block text-[12px] text-amber-400 mt-0.5">
              {formatCurrency(pendingAmt)} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CashbookCustomerGroupCard({
  group,
  formatCurrency,
  onViewBill,
  customerLink,
  onPayPending,
}: {
  group: CustomerGroup;
  formatCurrency: (v: number) => string;
  onViewBill: (id: string) => void;
  customerLink?: (customerId: string) => string;
  onPayPending?: (entry: CashBookEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pending = group.pendingTotal || 0;
  const hasPending = pending > 0;
  const isCustom = group.isCustomName === true;

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
        className="px-4 sm:px-5 py-3 sm:py-3.5 cursor-pointer transition-colors rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {group.customerId && customerLink ? (
                <a
                  href={customerLink(group.customerId)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm sm:text-base font-semibold text-white truncate max-w-[150px] sm:max-w-none hover:text-cyan-300 transition-colors"
                >
                  {group.customerName}
                </a>
              ) : (
                <p className="text-sm sm:text-base font-semibold text-white truncate max-w-[150px] sm:max-w-none">
                  {group.customerName}
                </p>
              )}
              {isCustom && (
                <span className="text-[12px] px-1.5 py-0.5 rounded-md font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  Custom
                </span>
              )}
              {!isCustom && group.customerId && (
                <span className="text-[12px] px-1.5 py-0.5 rounded-md font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  Customer
                </span>
              )}
              <span
                className={`text-[12px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium ${
                  group.type === "credit"
                    ? "bg-emerald-900/30 text-emerald-300"
                    : "bg-red-900/30 text-red-300"
                }`}
              >
                {group.type === "credit" ? "Credit" : "Debit"}
              </span>
              <span className="text-[12px] sm:text-[11px] text-gray-400 bg-white/[0.04] px-1.5 sm:px-2 py-0.5 rounded-md">
                {group.entries.length} payment
                {group.entries.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-base sm:text-lg font-bold text-white">
                {formatCurrency(group.totalAmount)}
              </span>
              {hasPending && (
                <span className="text-[11px] text-amber-400/80">
                  &bull;{" "}
                  <span className="font-bold text-sm">
                    {formatCurrency(pending)}{" "}
                  </span>
                </span>
              )}
              <span className="text-[11px] text-white/40">
                Latest &bull; {group.latestTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                group.type === "credit"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {group.type === "credit" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
            <div className="flex items-center justify-center w-6 h-6">
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <ChevronDown className="w-4 h-4 text-white/40" />
              </motion.span>
            </div>
          </div>
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
                  onPayPending={onPayPending}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function toIST(dateInput: string | number | Date): Date {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 5.5 * 3600_000);
}

function normalizeToUTC(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date(NaN);
  const s = String(dateStr).trim();
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  return new Date(s + "Z");
}

function parseEntryTime(entry: CashBookEntry): Date {
  const updated = normalizeToUTC(entry.updatedAt);
  const created = normalizeToUTC(entry.createdAt);
  if (updated > created) return updated;
  return created;
}

function formatISTDate(dateInput: string | undefined | null): string {
  if (!dateInput) return "";
  const d = normalizeToUTC(dateInput);
  if (isNaN(d.getTime())) return "";
  return format(toIST(d), "yyyy-MM-dd");
}

function formatISTTime(dateInput: string | undefined | null): string {
  if (!dateInput) return "";
  const d = normalizeToUTC(dateInput);
  if (isNaN(d.getTime())) return "";
  return format(toIST(d), "hh:mm a");
}

function getEntryDisplayDate(entry: CashBookEntry): string {
  const ts = parseEntryTime(entry);
  if (isNaN(ts.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(toIST(ts), "yyyy-MM-dd");
}

export function groupEntriesByDateAndCustomer(
  entries: CashBookEntry[],
  pendingTotals?: {
    byUser: Map<string, number>;
    byCustomerName: Map<string, number>;
  },
) {
  function resolveDisplayName(entry: CashBookEntry): string {
    if (entry.customerName) return entry.customerName;
    if (entry.userName) return entry.userName;
    if (entry.user?.name) return entry.user.name;
    return "Unnamed Record";
  }

  function resolveCustomerId(entry: CashBookEntry): string {
    if (entry.customerId) return entry.customerId;
    if (entry.user?._id) return entry.user._id;
    return "";
  }

  function resolveCustomerGroupKey(entry: CashBookEntry): string {
    const cid = resolveCustomerId(entry);
    if (cid) return `cid:${cid}`;
    const name = (entry.customerName || entry.userName || entry.user?.name || "unnamed")
      .trim().toLowerCase().replace(/\s+/g, " ");
    return `name:${name}`;
  }

  const customerMap: {
    [groupKey: string]: {
      key: string;
      customerName: string;
      type: "credit" | "debit";
      entries: CashBookEntry[];
      isCustomName: boolean;
      customerId: string | null;
      latestActivityAt: number;
    };
  } = {};

  for (const entry of entries) {
    const groupKey = `${resolveCustomerGroupKey(entry)}|${entry.type}`;
    if (!customerMap[groupKey]) {
      const cid = resolveCustomerId(entry);
      customerMap[groupKey] = {
        key: groupKey,
        customerName: resolveDisplayName(entry),
        type: entry.type,
        entries: [],
        isCustomName: entry.isCustomName === true && !cid,
        customerId: cid || null,
        latestActivityAt: 0,
      };
    }
    customerMap[groupKey].entries.push(entry);
    const entryTime = parseEntryTime(entry).getTime();
    if (Number.isFinite(entryTime) && entryTime > customerMap[groupKey].latestActivityAt) {
      customerMap[groupKey].latestActivityAt = entryTime;
    }
  }

  const customerGroups = Object.values(customerMap);

  for (const group of customerGroups) {
    group.entries.sort(
      (a, b) => parseEntryTime(b).getTime() - parseEntryTime(a).getTime(),
    );
  }

  const dateMap: { [date: string]: CustomerGroup[] } = {};
  for (const group of customerGroups) {
    const newestEntry = group.entries[0];
    const date = getEntryDisplayDate(newestEntry);
    if (!dateMap[date]) dateMap[date] = [];

    const totalAmount = group.entries.reduce((sum, e) => sum + e.amount, 0);
    const latestActivityAt = group.latestActivityAt;
    const latestTime = formatISTTime(newestEntry?.createdAt);

    let pendingTotal = 0;
    if (pendingTotals) {
      if (group.customerId && pendingTotals.byUser.has(group.customerId)) {
        pendingTotal = pendingTotals.byUser.get(group.customerId) || 0;
      } else if (pendingTotals.byCustomerName.has(group.customerName)) {
        pendingTotal = pendingTotals.byCustomerName.get(group.customerName) || 0;
      }
    }

    dateMap[date].push({
      key: group.key,
      customerName: group.customerName,
      type: group.type,
      source: group.entries[0].source,
      entries: group.entries,
      totalAmount,
      latestTime,
      pendingTotal,
      isCustomName: group.isCustomName,
      customerId: group.customerId,
    });
  }

  const result: { date: string; groups: CustomerGroup[] }[] = [];
  for (const [date, groups] of Object.entries(dateMap)) {
    groups.sort((a, b) => {
      const aTime = a.entries[0] ? parseEntryTime(a.entries[0]).getTime() : 0;
      const bTime = b.entries[0] ? parseEntryTime(b.entries[0]).getTime() : 0;
      return bTime - aTime;
    });
    result.push({ date, groups });
  }

  result.sort((a, b) => {
    const aMax = a.groups[0] ? parseEntryTime(a.groups[0].entries[0]).getTime() : 0;
    const bMax = b.groups[0] ? parseEntryTime(b.groups[0].entries[0]).getTime() : 0;
    return bMax - aMax;
  });

  return result;
}
