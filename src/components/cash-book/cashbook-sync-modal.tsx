"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  SkipForward,
  RefreshCw,
  Shuffle,
  Search,
  X,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sanityClient } from "@/lib/sanity";
import { format } from "date-fns";

const SKIP_PREFIX = "cashbook_sync_skip_";

interface UnsyncedBill {
  _id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  paidAmount: number;
  totalAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  paymentDate?: string;
  updatedAt?: string;
  discount?: number;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  bills: UnsyncedBill[];
}

interface CashbookSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: () => void;
}

export function CashbookSyncModal({
  isOpen,
  onClose,
  onSynced,
}: CashbookSyncModalProps) {
  const [tab, setTab] = useState<"unsynced" | "shuttle">("unsynced");
  const [unsyncedBills, setUnsyncedBills] = useState<UnsyncedBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [shuttleCustomer, setShuttleCustomer] = useState("");
  const [shuttleAmount, setShuttleAmount] = useState("");
  const [shuttleDate, setShuttleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [shuttleNotes, setShuttleNotes] = useState("");
  const [shuttleProcessing, setShuttleProcessing] = useState(false);

  const fetchUnsyncedBills = useCallback(async () => {
    setLoading(true);
    try {
      const [bills, entries] = await Promise.all([
        sanityClient.fetch(
          `*[_type == "bill" && paymentStatus in ["paid", "partial"] && defined(customer)] | order(updatedAt desc) {
            _id,
            billNumber,
            paidAmount,
            totalAmount,
            balanceAmount,
            paymentStatus,
            paymentDate,
            updatedAt,
            discount,
            customer->{
              _id,
              name,
              phone
            }
          }`
        ),
        sanityClient.fetch(
          `*[_type == "cashBookEntry" && source == "Bill Payment" && defined(bill)] {
            bill->{_id}
          }`
        ),
      ]);

      const syncedBillIds = new Set(
        entries
          .map((e: any) => e.bill?._id)
          .filter(Boolean)
      );

      const unsynced = bills
        .filter((b: any) => !syncedBillIds.has(b._id))
        .filter((b: any) => {
          if (typeof window === "undefined") return true;
          try {
            return localStorage.getItem(SKIP_PREFIX + b.customer._id) !== "true";
          } catch {
            return true;
          }
        })
        .map((b: any) => ({
          _id: b._id,
          billNumber: b.billNumber || "",
          customerId: b.customer._id,
          customerName: b.customer.name || "Unknown Customer",
          customerPhone: b.customer.phone || "",
          paidAmount: b.paidAmount || 0,
          totalAmount: b.totalAmount || 0,
          balanceAmount: b.balanceAmount ?? 0,
          paymentStatus: b.paymentStatus || "",
          paymentDate: b.paymentDate || b.updatedAt || undefined,
          updatedAt: b.updatedAt || undefined,
          discount: b.discount || 0,
        }));

      setUnsyncedBills(unsynced);
    } catch (err) {
      console.error("Failed to fetch unsynced bills:", err);
      toast.error("Failed to check sync status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUnsyncedBills();
      setTab("unsynced");
      setSearchTerm("");
    }
  }, [isOpen, fetchUnsyncedBills]);

  const customerGroups: CustomerGroup[] = Object.values(
    unsyncedBills.reduce<Record<string, CustomerGroup>>((acc, bill) => {
      if (!acc[bill.customerId]) {
        acc[bill.customerId] = {
          customerId: bill.customerId,
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          bills: [],
        };
      }
      acc[bill.customerId].bills.push(bill);
      return acc;
    }, {})
  );

  const filteredGroups = searchTerm
    ? customerGroups.filter(
        (g) =>
          g.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.customerPhone?.includes(searchTerm) ||
          g.bills.some((b) =>
            b.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : customerGroups;

  const handleCreateEntry = async (bill: UnsyncedBill) => {
    setSyncing((prev) => new Set(prev).add(bill._id));
    try {
      const timestamp = bill.paymentDate || bill.updatedAt || new Date().toISOString();

      const res = await fetch("/api/mutations/cashbook/create-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: {
            user: { _type: "reference", _ref: bill.customerId },
            userName: bill.customerName,
            customerName: bill.customerName,
            customerId: bill.customerId,
            amount: bill.paidAmount,
            totalAmount: bill.totalAmount || bill.paidAmount,
            pendingAmount: 0,
            receivedAmount: bill.paidAmount,
            status: "completed",
            type: "credit",
            source: "Bill Payment",
            notes: `Payment received for Bill ${bill.billNumber}`,
            bill: { _type: "reference", _ref: bill._id },
            createdAt: timestamp,
          },
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to create entry");
      }

      toast.success(`Entry created for Bill ${bill.billNumber}`);
      setUnsyncedBills((prev) => prev.filter((b) => b._id !== bill._id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to create cashbook entry");
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(bill._id);
        return next;
      });
    }
  };

  const handleSkipCustomer = (customerId: string) => {
    try {
      localStorage.setItem(SKIP_PREFIX + customerId, "true");
    } catch {}
    setUnsyncedBills((prev) =>
      prev.filter((b) => b.customerId !== customerId)
    );
    toast.success("Customer skipped");
  };

  const handleSkipBill = (bill: UnsyncedBill) => {
    try {
      localStorage.setItem(SKIP_PREFIX + bill.customerId, "true");
    } catch {}
    setUnsyncedBills((prev) => prev.filter((b) => b._id !== bill._id));
    toast.success("Bill skipped");
  };

  const handleSyncAll = async () => {
    const toSync = [...unsyncedBills];
    if (toSync.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const bill of toSync) {
      setSyncing((prev) => new Set(prev).add(bill._id));
      try {
        const timestamp = bill.paymentDate || bill.updatedAt || new Date().toISOString();
        const res = await fetch("/api/mutations/cashbook/create-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry: {
              user: { _type: "reference", _ref: bill.customerId },
              userName: bill.customerName,
              customerName: bill.customerName,
              customerId: bill.customerId,
            amount: bill.paidAmount,
            totalAmount: bill.totalAmount || bill.paidAmount,
            pendingAmount: 0,
            receivedAmount: bill.paidAmount,
            status: "completed",
            type: "credit",
            source: "Bill Payment",
            notes: `Payment received for Bill ${bill.billNumber}`,
            bill: { _type: "reference", _ref: bill._id },
            createdAt: timestamp,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(bill._id);
        return next;
      });
    }
  }

    if (successCount > 0) {
      toast.success(`${successCount} entry(s) created successfully`);
      if (failCount === 0) {
        onSynced?.();
        onClose();
        return;
      }
    }
    if (failCount > 0) {
      toast.error(`${failCount} entry(s) failed`);
    }
    fetchUnsyncedBills();
  };

  const handleShuttleSubmit = async () => {
    const amount = Number(shuttleAmount);
    if (!shuttleCustomer || !amount || amount <= 0) {
      toast.error("Please fill customer name and amount");
      return;
    }

    setShuttleProcessing(true);
    try {
      const res = await fetch("/api/mutations/cashbook/create-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: {
            userName: shuttleCustomer,
            customerName: shuttleCustomer,
            amount,
            totalAmount: amount,
            pendingAmount: 0,
            receivedAmount: amount,
            status: "completed",
            type: "credit",
            source: "Manual",
            notes: shuttleNotes || "Cash book shuttle entry",
            createdAt: new Date(shuttleDate).toISOString(),
          },
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to create shuttle entry");
      }

      toast.success("Shuttle entry created");
      setShuttleCustomer("");
      setShuttleAmount("");
      setShuttleDate(new Date().toISOString().split("T")[0]);
      setShuttleNotes("");
      onSynced?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create shuttle entry");
    } finally {
      setShuttleProcessing(false);
    }
  };

  const totalUnsynced = unsyncedBills.length;
  const totalAmount = unsyncedBills.reduce((s, b) => s + b.paidAmount, 0);

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Book Sync"
      size="lg"
      zIndex={350}
      mobileType="bottom-sheet"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-white/[0.06] p-1">
          <button
            onClick={() => setTab("unsynced")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "unsynced"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Unsynced Bills
            {totalUnsynced > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400">
                {totalUnsynced}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("shuttle")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "shuttle"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <Shuffle className="w-4 h-4" />
            Shuttle
          </button>
        </div>

        {tab === "unsynced" && (
          <div className="space-y-3">
            {/* Summary + Actions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">
                {totalUnsynced > 0
                  ? `${totalUnsynced} bill(s) · ₹${totalAmount.toLocaleString()}`
                  : "All bills synced"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUnsyncedBills}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                {totalUnsynced > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSyncAll}
                    disabled={syncing.size > 0}
                    className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500"
                  >
                    {syncing.size > 0 ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Sync All
                  </Button>
                )}
              </div>
            </div>

            {/* Search */}
            {customerGroups.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search customer or bill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-9 bg-white/[0.04] border-white/[0.08] text-sm"
                />
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            )}

            {/* Empty */}
            {!loading && totalUnsynced === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-white/70 font-medium">
                  All bills are synced
                </p>
                <p className="text-sm text-white/40 mt-1">
                  No pending cash book entries
                </p>
              </div>
            )}

            {/* Customer Groups */}
            {!loading &&
              filteredGroups.map((group) => (
                <div
                  key={group.customerId}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  {/* Customer Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white/70">
                          {group.customerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {group.customerName}
                        </p>
                        {group.customerPhone && (
                          <p className="text-[11px] text-white/40">
                            {group.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-white/40">
                        {group.bills.length} bill(s)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkipCustomer(group.customerId)}
                        className="gap-1 text-xs h-7 px-2"
                      >
                        <SkipForward className="w-3 h-3" />
                        Skip
                      </Button>
                    </div>
                  </div>

                  {/* Bills */}
                  <div className="divide-y divide-white/[0.04]">
                    {group.bills.map((bill) => {
                      const isSyncing = syncing.has(bill._id);
                      const displayDate = bill.paymentDate || bill.updatedAt;
                      return (
                        <div
                          key={bill._id}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/80">
                              {bill.billNumber || bill._id.slice(-6)}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs font-medium text-emerald-400">
                                ₹{bill.paidAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider text-white/30">
                                {bill.paymentStatus}
                              </span>
                              {displayDate && (
                                <span className="text-[10px] text-white/30 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(displayDate), "dd MMM yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleCreateEntry(bill)}
                              disabled={isSyncing}
                              className="gap-1 h-7 text-xs bg-emerald-600/80 hover:bg-emerald-600"
                            >
                              {isSyncing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wallet className="w-3 h-3" />
                              )}
                              Create
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSkipBill(bill)}
                              disabled={isSyncing}
                              className="gap-1 h-7 text-xs"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === "shuttle" && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Create a manual cash book entry for reconciliation or adjustments.
            </p>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Customer Name
              </label>
              <Input
                value={shuttleCustomer}
                onChange={(e) => setShuttleCustomer(e.target.value)}
                placeholder="Enter customer name..."
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Amount (₹)
              </label>
              <Input
                type="number"
                value={shuttleAmount}
                onChange={(e) => setShuttleAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Date
              </label>
              <Input
                type="date"
                value={shuttleDate}
                onChange={(e) => setShuttleDate(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Notes (optional)
              </label>
              <Input
                value={shuttleNotes}
                onChange={(e) => setShuttleNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <Button
              onClick={handleShuttleSubmit}
              disabled={shuttleProcessing}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              {shuttleProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
              {shuttleProcessing ? "Creating..." : "Create Shuttle Entry"}
            </Button>
          </div>
        )}
      </div>
    </BaseGlassModal>
  );
}

export function isCashbookSyncSkipped(customerId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SKIP_PREFIX + customerId) === "true";
  } catch {
    return false;
  }
}

export function resetCashbookSyncSkip(customerId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SKIP_PREFIX + customerId);
  } catch {}
}
