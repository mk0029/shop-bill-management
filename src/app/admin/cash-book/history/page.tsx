"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { toast } from "sonner";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Modal } from "@/components/ui/modal";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Search, Filter, X } from "lucide-react";
import { sanityApiService } from "@/lib/sanity-api-service";
import { useCashBookRealtime } from "@/hooks/use-cash-book-realtime";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import {
  CashBookEntry,
  CashbookCustomerGroupCard,
  CustomerGroup,
  groupEntriesByDateAndCustomer,
} from "@/components/cash-book/cash-book-shared";
import { computePendingTotals } from "@/lib/cashbook-calculations";

interface User {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export default function CashBookHistoryPage() {
  const { role } = useAuthStore();
  const router = useRouter();
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">(
    "all",
  );
  const [filterSource, setFilterSource] = useState<
    "all" | "Manual" | "Bill Payment"
  >("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  useCashBookRealtime({
    onEntryAdded: (newEntry) => {
      setEntries((prev) => [newEntry, ...prev]);
      toast.success(
        `Cash book entry added: ${newEntry.type === "credit" ? "+" : "-"}₹${newEntry.amount}`,
      );
    },
    onEntryUpdated: (updatedEntry) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id ? updatedEntry : entry,
        ),
      );
    },
    onEntryDeleted: (deletedId) => {
      setEntries((prev) => prev.filter((entry) => entry._id !== deletedId));
    },
  });

  useEffect(() => {
    if (role === "technician") {
      router.replace("/admin/cash-book");
      return;
    }
    loadData();
  }, [role]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesResponse, usersResponse] = await Promise.all([
        sanityApiService.cashBook.getAllEntries(),
        sanityApiService.users.getAllUsers(),
      ]);
      if (entriesResponse.success && entriesResponse.data)
        setEntries(entriesResponse.data);
      if (usersResponse.success && usersResponse.data)
        setUsers(usersResponse.data);
    } catch (error) {
      console.error("Error loading cash book data:", error);
      toast.error("Failed to load cash book data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const filteredEntries = entries.filter((entry) => {
    const displayName = entry.customerName || entry.userName || "";
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.user?.phone && entry.user.phone.includes(searchTerm)) ||
      (entry.bill?.billNumber &&
        entry.bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesSource =
      filterSource === "all" || entry.source === filterSource;
    const matchesUser = filterUser === "all" || entry.user?._id === filterUser;
    return matchesSearch && matchesType && matchesSource && matchesUser;
  });

  const pendingTotals = computePendingTotals(entries);
  const groupedData = groupEntriesByDateAndCustomer(filteredEntries, pendingTotals);

  const getDayLabel = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getWeekLabel = (date: Date): string => {
    const now = new Date();
    const startOfWeek = (d: Date) => {
      const s = new Date(d);
      s.setDate(s.getDate() - s.getDay());
      s.setHours(0, 0, 0, 0);
      return s;
    };
    const endOfWeek = (d: Date) => {
      const e = new Date(d);
      e.setDate(e.getDate() + (6 - e.getDay()));
      e.setHours(23, 59, 59, 999);
      return e;
    };
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    if (date >= thisWeekStart && date <= thisWeekEnd) return "This Week";
    if (date >= lastWeekStart && date <= lastWeekEnd) return "Last Week";
    const ws = startOfWeek(date);
    const we = endOfWeek(date);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `${fmt(ws)} \u2013 ${fmt(we)} ${date.getFullYear()}`;
  };

  const getMonthLabel = (date: Date): string => {
    const now = new Date();
    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
      return "This Month";
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    if (
      date.getMonth() === lastMonth.getMonth() &&
      date.getFullYear() === lastMonth.getFullYear()
    )
      return "Last Month";
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const getTimeKey = (date: Date, mode: string): string => {
    if (mode === "day")
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (mode === "week") {
      const s = new Date(date);
      s.setDate(s.getDate() - s.getDay());
      return `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`;
    }
    if (mode === "month") return `${date.getFullYear()}-${date.getMonth()}`;
    return "";
  };

  const getTimeLabel = (date: Date, mode: string): string => {
    if (mode === "day") return getDayLabel(date);
    if (mode === "week") return getWeekLabel(date);
    if (mode === "month") return getMonthLabel(date);
    return "";
  };

  const groupedByTime = useMemo(() => {
    type DateSection = { date: string; groups: CustomerGroup[] };
    const map = new Map<
      string,
      {
        label: string;
        sections: DateSection[];
        sortKey: number;
        totalCredits: number;
        totalDebits: number;
      }
    >();

    for (const section of groupedData) {
      const sectionDate = new Date(section.date + "T12:00:00");
      const key = getTimeKey(sectionDate, groupBy);
      const label = getTimeLabel(sectionDate, groupBy);
      if (!map.has(key)) {
        map.set(key, {
          label,
          sections: [],
          sortKey: sectionDate.getTime(),
          totalCredits: 0,
          totalDebits: 0,
        });
      }
      const bucket = map.get(key)!;
      bucket.sections.push(section);
      for (const group of section.groups) {
        if (group.type === "credit") bucket.totalCredits += group.totalAmount;
        else bucket.totalDebits += group.totalAmount;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.sortKey - a.sortKey);
  }, [groupedData, groupBy]);

  const handleViewBill = async (billId: string) => {
    try {
      const bill = await sanityApiService.bills.getBillById(billId);
      if (bill.success && bill.data) {
        setSelectedBill(bill.data);
        setShowBillModal(true);
      } else {
        toast.error("Failed to fetch bill details");
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
      toast.error("Failed to fetch bill details");
    }
  };

  const hasActiveFilters =
    filterType !== "all" || filterSource !== "all" || filterUser !== "all";
  const activeFilterCount = [
    filterType !== "all",
    filterSource !== "all",
    filterUser !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType("all");
    setFilterSource("all");
    setFilterUser("all");
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading cash book history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full rounded-lg max-sm:-mt-3">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Search + Day/Week/Month + Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute  left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, bill..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 !pl-8 h-10 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 shrink-0">
            {(["day", "week", "month"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setGroupBy(opt)}
                className={`px-2.5 py-1 w-full text-sm rounded-full font-medium transition-all ${
                  groupBy === opt
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                }`}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>

          {(hasActiveFilters || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-400 hover:text-white h-10">
              Clear
            </Button>
          )}
        </div>

        {/* Records */}
        {groupedByTime.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-400">
              No entries found matching your filters
            </p>
          </Card>
        ) : (
          <div className="max-h-[88dvh] overflow-auto space-y-6 sm:space-y-8">
            {groupedByTime.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center justify-between mb-3 sm:mb-4 sticky top-0 z-40 bg-gray-900">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <h3 className="text-sm sm:text-base font-semibold text-white/70">
                      {bucket.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {bucket.totalCredits > 0 && (
                      <span className="text-emerald-400">
                        +{formatCurrency(bucket.totalCredits)}
                      </span>
                    )}
                    {bucket.totalDebits > 0 && (
                      <span className="text-red-400">
                        -{formatCurrency(bucket.totalDebits)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {bucket.sections.map((section) => (
                    <div key={section.date} className="space-y-3 sm:space-y-4">
                      {groupBy !== "day" && (
                        <p className="text-xs text-white/40 px-1">
                          {format(
                            new Date(section.date + "T12:00:00"),
                            "MMM d, yyyy",
                          )}
                        </p>
                      )}
                      {section.groups.map((group) => (
                        <CashbookCustomerGroupCard
                          key={group.key}
                          group={group}
                          formatCurrency={formatCurrency}
                          onViewBill={handleViewBill}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter Modal */}
        <Modal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          title="Filters"
          size="sm">
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="filter-type"
                className="text-gray-300 text-sm mb-1.5 block">
                Type
              </Label>
              <SelectField
                id="filter-type"
                value={filterType}
                onValueChange={(value: "all" | "credit" | "debit") =>
                  setFilterType(value)
                }
                options={[
                  { value: "all", label: "All Types" },
                  { value: "credit", label: "Credit" },
                  { value: "debit", label: "Debit" },
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label
                htmlFor="filter-source"
                className="text-gray-300 text-sm mb-1.5 block">
                Source
              </Label>
              <SelectField
                id="filter-source"
                value={filterSource}
                onValueChange={(value: "all" | "Manual" | "Bill Payment") =>
                  setFilterSource(value)
                }
                options={[
                  { value: "all", label: "All Sources" },
                  { value: "Manual", label: "Manual" },
                  { value: "Bill Payment", label: "Bill Payment" },
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label
                htmlFor="filter-user"
                className="text-gray-300 text-sm mb-1.5 block">
                User
              </Label>
              <SelectField
                id="filter-user"
                value={filterUser}
                onValueChange={setFilterUser}
                options={[
                  { value: "all", label: "All Users" },
                  ...users.map((user) => ({
                    value: user._id,
                    label: user.name,
                  })),
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:text-white"
                onClick={() => {
                  setFilterType("all");
                  setFilterSource("all");
                  setFilterUser("all");
                }}>
                Reset
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => setShowFilterModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>

        <BillDetailModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          bill={selectedBill}
          onDownloadPDF={() => {}}
          showShareButton={false}
          showPaymentControls={false}
        />
      </div>
    </div>
  );
}
