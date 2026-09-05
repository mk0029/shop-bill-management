"use client";

import { useState, useEffect } from "react";
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
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

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
    const hasPending = (Number(entry.pendingAmount) || 0) > 0;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" ? hasPending : !hasPending);
    return (
      matchesSearch &&
      matchesType &&
      matchesSource &&
      matchesUser &&
      matchesStatus
    );
  });

  const pendingTotals = computePendingTotals(entries);
  const groupedData = groupEntriesByDateAndCustomer(
    filteredEntries,
    pendingTotals,
  );

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
    filterType !== "all" ||
    filterSource !== "all" ||
    filterUser !== "all" ||
    filterStatus !== "all";
  const activeFilterCount = [
    filterType !== "all",
    filterSource !== "all",
    filterUser !== "all",
    filterStatus !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType("all");
    setFilterSource("all");
    setFilterUser("all");
    setFilterStatus("all");
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
      <div className="flex items-center gap-4 md:pb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Cash Book History
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 mt-2 sm:mt-6">
        {/* Search + Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, bill..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 !pl-10 h-10 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setFilterStatus(filterStatus === "pending" ? "all" : "pending")
            }
            className={`h-10 px-3 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              filterStatus === "pending"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
            }`}
          >
            Pending
          </button>
          <Button
            size="sm"
            onClick={() => setShowFilterModal(true)}
            className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 h-10 relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {(hasActiveFilters || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-400 hover:text-white h-10"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Records */}
        {groupedData.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-400">
              No entries found matching your filters
            </p>
          </Card>
        ) : (
          <div className="max-h-[88dvh] overflow-auto space-y-6 sm:space-y-8">
            {groupedData.map(({ date, groups }) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <h3 className="text-sm sm:text-base font-semibold text-white/70">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {groups.map((group) => (
                    <CashbookCustomerGroupCard
                      key={group.key}
                      group={group}
                      formatCurrency={formatCurrency}
                      onViewBill={handleViewBill}
                    />
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
          size="sm"
        >
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="filter-type"
                className="text-gray-300 text-sm mb-1.5 block"
              >
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
                className="text-gray-300 text-sm mb-1.5 block"
              >
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
                htmlFor="filter-status"
                className="text-gray-300 text-sm mb-1.5 block"
              >
                Status
              </Label>
              <SelectField
                id="filter-status"
                value={filterStatus}
                onValueChange={(value: "all" | "pending" | "completed") =>
                  setFilterStatus(value)
                }
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "completed", label: "Completed" },
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label
                htmlFor="filter-user"
                className="text-gray-300 text-sm mb-1.5 block"
              >
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
                  setFilterStatus("all");
                }}
              >
                Reset
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => setShowFilterModal(false)}
              >
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
