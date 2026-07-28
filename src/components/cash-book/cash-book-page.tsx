"use client";

import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashBookRealtime } from "@/hooks/use-cash-book-realtime";
import { sanityApiService } from "@/lib/sanity-api-service";
import { format } from "date-fns";
import {
  Plus,
  XIcon,
  Wallet,
  Search,
  History,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { stockApi } from "@/lib/inventory-api";
import { toast } from "sonner";
import Link from "next/link";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { useItemSelection } from "@/hooks/use-item-selection";
import {
  useBrands,
  useCategories,
  useCustomers,
  useProducts,
} from "@/hooks/use-sanity-data";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { sanityClient } from "@/lib/sanity";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { SearchableCustomerInput } from "@/components/cash-book/searchable-customer-input";
import { PayPendingModal } from "@/components/cash-book/pay-pending-modal";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import {
  updateCustomerAdvanceBalance,
  createAdvanceTransaction,
} from "@/lib/customer-advance";
import {
  roundCurrency,
  calculateReceivedAmount,
  formatCurrencyINR,
  validateManualRecord,
  buildRecordPayload,
  computePendingTotals,
  type CustomerSelection,
} from "@/lib/cashbook-calculations";
import {
  CashBookEntry,
  CashbookCustomerGroupCard,
  groupEntriesByDateAndCustomer,
} from "./cash-book-shared";
import { manualCashbookNamesService } from "@/lib/manual-cashbook-names";
import { Checkbox } from "../ui/checkbox";

interface CashBookSummary {
  totalCredits: number;
  totalDebits: number;
  balance: number;
}

interface User {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export function CashBookPage() {
  const { role, user: authUser } = useAuthStore();
  const isTechnician = role === "technician";
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<CashBookSummary>({
    totalCredits: 0,
    totalDebits: 0,
    balance: 0,
  });
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInventorySale, setShowInventorySale] = useState(false);
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState<
    Record<string, { name: string; price: number; qty: number; maxQty: number }>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [manualNames, setManualNames] = useState<
    Array<{ _id: string; name: string; usageCount: number; lastUsedAt: string }>
  >([]);
  const [payEntry, setPayEntry] = useState<CashBookEntry | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const { customers } = useCustomers();
  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  const [customerSelection, setCustomerSelection] = useState<CustomerSelection>(
    {
      customerId: null,
      customerName: "",
      isCustomName: false,
    },
  );
  const [amount, setAmount] = useState<string>("");
  const [pendingAmountStr, setPendingAmountStr] = useState<string>("0");
  const [purpose, setPurpose] = useState("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "credit",
  );
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);

  const parsedTotalAmount = Number(amount);
  const parsedPendingAmount = Number(pendingAmountStr);
  const isDebit = transactionType === "debit";

  const safeTotal = roundCurrency(
    Number.isFinite(parsedTotalAmount) ? parsedTotalAmount : 0,
  );
  const safePending = isDebit
    ? 0
    : roundCurrency(
        Number.isFinite(parsedPendingAmount) ? parsedPendingAmount : 0,
      );
  const receivedAmount = calculateReceivedAmount(
    safeTotal,
    safePending,
    transactionType,
  );

  const pendingAmountError =
    !isDebit && parsedPendingAmount > safeTotal && safeTotal > 0
      ? "Pending amount cannot be greater than total amount"
      : null;

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [entriesRes, usersRes, summaryRes, manualNamesRes] =
          await Promise.all([
            sanityApiService.cashBook.getAllEntries(),
            sanityApiService.users.getAllUsers(),
            sanityApiService.cashBook.getSummary(),
            manualCashbookNamesService.getAll(),
          ]);
        if (entriesRes.success) setEntries(entriesRes.data as CashBookEntry[]);
        if (usersRes.success) setUsers(usersRes.data as User[]);
        if (summaryRes.success) setSummary(summaryRes.data as CashBookSummary);
        if (manualNamesRes.success) setManualNames(manualNamesRes.data || []);
      } catch (error) {
        console.error("Failed to load initial cash book data:", error);
      }
    };
    loadInitialData();
  }, []);

  const refreshData = async () => {
    try {
      const [entriesRes, summaryRes, manualNamesRes] = await Promise.all([
        sanityApiService.cashBook.getAllEntries(),
        sanityApiService.cashBook.getSummary(),
        manualCashbookNamesService.getAll(),
      ]);
      if (entriesRes.success) setEntries(entriesRes.data as CashBookEntry[]);
      if (summaryRes.success) setSummary(summaryRes.data as CashBookSummary);
      if (manualNamesRes.success) setManualNames(manualNamesRes.data || []);
    } catch (error) {
      console.error("Failed to refresh cash book data:", error);
    }
  };

  const filteredEntries = (entries || [])
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const displayName = e.customerName || e.userName || "";
      return (
        displayName.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q) ||
        e.amount.toString().includes(q)
      );
    })
    .slice(0, 50);

  const pendingTotals = computePendingTotals(entries || []);
  const groupedData = groupEntriesByDateAndCustomer(
    filteredEntries,
    pendingTotals,
  );

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
    return `${fmt(ws)} – ${fmt(we)} ${date.getFullYear()}`;
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
  const filteredItems = filterItemsBySpecifications(activeProducts);

  const saleTotal = Object.values(selectedSaleItems).reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0,
  );

  const onAddSaleItem = (p: any) => {
    setSelectedSaleItems((prev) => {
      const next = { ...prev };
      const available = Number(p?.inventory?.currentStock ?? 0) || 0;
      const defaultPrice = Number(p?.pricing?.sellingPrice || 0) || 0;
      if (available <= 0) {
        toast.error(`${p?.name ?? "Item"} is out of stock`);
        return prev;
      }
      const existing = next[p._id];
      if (existing) {
        next[p._id] = {
          ...existing,
          qty: Math.min(existing.qty + 1, available),
        };
      } else {
        next[p._id] = {
          name: p.name,
          price: defaultPrice,
          qty: 1,
          maxQty: available,
        };
      }
      return next;
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setSelectedSaleItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          qty: Math.max(1, Math.min(current.maxQty, Number(quantity) || 1)),
        },
      };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedSaleItems((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleClearAll = () => setSelectedSaleItems({});

  const submitInventorySale = async () => {
    const items = Object.values(selectedSaleItems);
    if (items.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    const total = items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0,
    );
    if (!(total > 0)) {
      toast.error("Total must be greater than 0");
      return;
    }
    try {
      setIsAddingSale(true);
      for (const [productId, it] of Object.entries(selectedSaleItems)) {
        if (it.qty > it.maxQty) {
          toast.error(
            `Quantity for ${it.name} exceeds available stock (${it.maxQty})`,
          );
          setIsAddingSale(false);
          return;
        }
        if (it.qty <= 0) {
          toast.error(`Quantity for ${it.name} must be at least 1`);
          setIsAddingSale(false);
          return;
        }
        const amount = (Number(it.qty) || 0) * (Number(it.price) || 0);
        if (!(amount > 0)) continue;
        const createdEntryRes = await sanityApiService.cashBook.createEntry({
          userName: it.name,
          amount,
          type: "credit",
          source: "Sale",
          category: "inventory",
          notes: `Cash sale: ${it.name} x${it.qty} @₹${it.price}`,
          createdAt: new Date().toISOString(),
          product: { _type: "reference", _ref: productId },
          quantity: Number(it.qty) || 0,
          unitPrice: Number(it.price) || 0,
        });
        const createdEntryId = (createdEntryRes as any)?.data?._id as
          | string
          | undefined;
        const stockTxRes = await stockApi.createStockTransaction({
          productId,
          type: "sale",
          quantity: Number(it.qty) || 0,
          unitPrice: Number(it.price) || 0,
          notes: "Sold via Cash Book",
          updateInventory: true,
        });
        const stockTxId = (stockTxRes as any)?.data?._id as string | undefined;
        if (createdEntryId && stockTxId) {
          try {
            await sanityClient
              .patch(stockTxId)
              .set({
                cashBookEntry: { _type: "reference", _ref: createdEntryId },
              })
              .commit();
          } catch {}
        }
      }
      toast.success("Sale items recorded in cash book");
      setShowInventorySale(false);
      setSelectedSaleItems({});
      const entriesResponse = await sanityApiService.cashBook.getAllEntries();
      if (entriesResponse.success && entriesResponse.data)
        setEntries(entriesResponse.data);
    } catch (e) {
      console.error("Failed to add sale record", e);
      toast.error("Failed to add sale record");
    } finally {
      setIsAddingSale(false);
    }
  };

  useCashBookRealtime({
    onEntryAdded: (newEntry) => {
      setEntries((prev) => [newEntry, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalCredits:
          prev.totalCredits +
          (newEntry.type === "credit" ? newEntry.amount : 0),
        totalDebits:
          prev.totalDebits + (newEntry.type === "debit" ? newEntry.amount : 0),
        balance:
          prev.balance +
          (newEntry.type === "credit" ? newEntry.amount : -newEntry.amount),
      }));
    },
    onEntryUpdated: (updatedEntry) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id ? updatedEntry : entry,
        ),
      );
    },
    onEntryDeleted: (deletedId) => {
      setEntries((prev) => {
        const deletedEntry = prev.find((entry) => entry._id === deletedId);
        if (deletedEntry) {
          setSummary((s) => ({
            ...s,
            totalCredits:
              s.totalCredits -
              (deletedEntry.type === "credit" ? deletedEntry.amount : 0),
            totalDebits:
              s.totalDebits -
              (deletedEntry.type === "debit" ? deletedEntry.amount : 0),
            balance:
              s.balance -
              (deletedEntry.type === "credit"
                ? deletedEntry.amount
                : -deletedEntry.amount),
          }));
        }
        return prev.filter((entry) => entry._id !== deletedId);
      });
    },
  });

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleViewBill = async (billId: string) => {
    if (!billId) {
      toast.error("Invalid bill ID");
      return;
    }
    try {
      const bill = await sanityApiService.bills.getBillById(billId);
      if (bill.success && bill.data) {
        setSelectedBill(bill.data);
        setShowBillModal(true);
      } else toast.error("Failed to load bill details");
    } catch {
      toast.error("Error loading bill details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateManualRecord({
      customer: customerSelection,
      totalAmount: safeTotal,
      pendingAmount: isDebit ? 0 : safePending,
      purpose,
      type: transactionType,
    });

    if (!validation.valid) {
      toast.error(validation.error || "Invalid input");
      return;
    }

    setIsSubmitting(true);
    try {
      const adminId = (authUser as any)?.id || (authUser as any)?._id || "";
      const payload = buildRecordPayload(
        {
          customer: customerSelection,
          totalAmount: safeTotal,
          pendingAmount: isDebit ? 0 : safePending,
          purpose,
          type: transactionType,
        },
        adminId,
      );

      const entryData: any = {
        amount: payload.amount,
        totalAmount: payload.totalAmount,
        pendingAmount: payload.pendingAmount,
        receivedAmount: payload.receivedAmount,
        type: payload.type,
        source: payload.source,
        status: payload.status,
        notes: payload.purpose,
        customerName: payload.customerName,
        customerId: payload.customerId,
        isCustomName: payload.isCustomName,
        createdBy: adminId,
        ...(isAdvancePayment ? { category: "advance" } : {}),
      };

      if (payload.customerId) {
        entryData.user = { _type: "reference", _ref: payload.customerId };
      }

      const result = await sanityApiService.cashBook.createEntry(entryData);
      if (result.success) {
        const newEntry = (result as any).data as CashBookEntry | undefined;
        // If advance payment and linked to a real customer, update their advance balance
        if (
          isAdvancePayment &&
          payload.customerId &&
          !payload.isCustomName &&
          receivedAmount > 0
        ) {
          (async () => {
            try {
              await updateCustomerAdvanceBalance(
                payload.customerId!,
                receivedAmount,
              );
              await createAdvanceTransaction({
                customerId: payload.customerId!,
                amount: receivedAmount,
                type: "created",
                reason: "cashbook_advance",
                reference: `Cashbook entry: ${payload.purpose}`,
                createdBy: adminId,
              });
            } catch (err) {
              console.error(
                "[Advance] Failed to update balance from cashbook entry:",
                err,
              );
            }
          })();
        }
        resetForm();
        setShowAddForm(false);
        setIsSubmitting(false);
        if (newEntry) {
          setEntries((prev) => [newEntry, ...prev]);
        }
        if (isAdvancePayment) {
          toast.success(
            `Advance payment of ${formatCurrencyINR(receivedAmount)} recorded for ${payload.customerName}`,
          );
        } else if (isDebit) {
          toast.success(`Manual debit entry added`);
        } else if (safePending > 0) {
          toast.success(
            `Record saved. ${formatCurrencyINR(receivedAmount)} received and ${formatCurrencyINR(safePending)} added to pending.`,
          );
        } else {
          toast.success("Cashbook record added successfully.");
        }
        sanityApiService.cashBook
          .getAllEntries()
          .then((r) => {
            if (r.success && r.data) setEntries(r.data);
          })
          .catch(() => {});
        sanityApiService.cashBook
          .getSummary()
          .then((r) => {
            if (r.success && r.data) setSummary(r.data);
          })
          .catch(() => {});
        manualCashbookNamesService
          .getAll()
          .then((r) => {
            if (r.success) setManualNames(r.data || []);
          })
          .catch(() => {});
        return;
      } else toast.error(result.error || "Failed to add cash book entry");
    } catch {
      toast.error("Failed to add cash book entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setPendingAmountStr("0");
    setPurpose("");
    setCustomerSelection({
      customerId: null,
      customerName: "",
      isCustomName: false,
    });
    setTransactionType("credit");
    setIsAdvancePayment(false);
  };

  const isSaveDisabled =
    isSubmitting ||
    !customerSelection.customerName.trim() ||
    !Number.isFinite(parsedTotalAmount) ||
    parsedTotalAmount <= 0 ||
    !purpose.trim() ||
    (!isDebit && parsedPendingAmount < 0) ||
    (!isDebit && parsedPendingAmount > safeTotal && safeTotal > 0);

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}

      {/* Summary strip */}
      {/* {!isTechnician && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-emerald-500/10 to-emerald-500/05 backdrop-blur-xl p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-[10px] sm:text-xs font-medium mb-1">
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Credits
            </div>
            <p className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">
              {formatCurrency(summary.totalCredits)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-red-500/10 to-red-500/05 backdrop-blur-xl p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-red-400 text-[10px] sm:text-xs font-medium mb-1">
              <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Debits
            </div>
            <p className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">
              {formatCurrency(summary.totalDebits)}
            </p>
          </div>
          <div
            className={`rounded-xl border border-white/[0.06] backdrop-blur-xl p-2.5 sm:p-4 bg-gradient-to-b ${summary.balance >= 0 ? "from-blue-500/10 to-blue-500/05" : "from-orange-500/10 to-orange-500/05"}`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium mb-1 text-blue-400">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Balance
            </div>
            <p
              className={`text-sm sm:text-lg md:text-xl font-bold truncate ${summary.balance >= 0 ? "text-blue-300" : "text-orange-300"}`}
            >
              {formatCurrency(Math.abs(summary.balance))}
              {summary.balance < 0 && (
                <span className="text-[10px] font-normal text-orange-400 ml-1">
                  (deficit)
                </span>
              )}
            </p>
          </div>
        </div>
      )} */}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative sm:flex-1 sm:min-w-0 max-sm:w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-slate-100 outline-none backdrop-blur-xl placeholder:text-slate-500 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 sm:shrink-0 max-sm:w-full max-sm:*:w-full">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (window.location.href = "/admin/cash-book/history")}
            className="gap-1.5">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowInventorySale(true)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Sale</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Record</span>
          </Button>

          <Link href="/admin/cashbooks">
            <Button size="sm" className="gap-1.5 max-sm:w-full">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Books</span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-between gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 shrink-0">
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

      {/* Inventory Sale Modal */}
      <BaseGlassModal
        isOpen={showInventorySale}
        onClose={() => setShowInventorySale(false)}
        showCloseButton={false}
        size="xl"
        mobileType="modal"
        zIndex={50}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] shrink-0">
          <h3 className="text-white font-semibold">Add Sale</h3>
          <button
            type="button"
            onClick={() => setShowInventorySale(false)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <div className="space-y-3">
            <ItemSelectionSection
              categories={categories}
              activeProducts={activeProducts}
              productsLoading={productsLoading}
              onOpenItemModal={(category) => openItemSelectionModal(category)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium text-sm">Selected Items</h4>
              <span className="text-white font-semibold">
                {formatCurrency(saleTotal)}
              </span>
            </div>
            <div className="border border-white/[0.06] rounded-lg max-h-[40vh] overflow-auto p-2 bg-white/[0.02]">
              <SelectedItemsList
                selectedItems={Object.entries(selectedSaleItems).map(
                  ([id, it]) => ({
                    id,
                    name: it.name,
                    price: Number(it.price) || 0,
                    quantity: Number(it.qty) || 0,
                    total: (Number(it.qty) || 0) * (Number(it.price) || 0),
                    category: "",
                    brand: "",
                    specifications: "",
                    unit: "",
                    maxStock: Number(it.maxQty) || 0,
                  }),
                )}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearAll={handleClearAll}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowInventorySale(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={submitInventorySale}
                disabled={
                  isAddingSale || Object.keys(selectedSaleItems).length === 0
                }>
                {isAddingSale ? "Adding..." : "Add Sale"}
              </Button>
            </div>
          </div>
        </div>
        <ItemSelectionModal
          isOpen={itemSelectionModal.isOpen}
          onClose={closeItemSelectionModal}
          selectedCategory={itemSelectionModal.selectedCategory}
          selectedSpecifications={itemSelectionModal.selectedSpecifications}
          onUpdateSpecification={updateSpecificationFilter}
          filteredItems={filteredItems}
          brands={brands}
          onAddItem={onAddSaleItem}
          activeProducts={activeProducts}
        />
      </BaseGlassModal>

      {/* Add Record Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => {
          if (!isSubmitting) setShowAddForm(false);
        }}
        title="Add Manual Record">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              {isDebit ? (
                <div className="space-y-1">
                  <Label className="text-gray-300 text-sm">
                    Recipient / Shop Name
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <Input
                      type="text"
                      value={customerSelection.customerName}
                      onChange={(e) =>
                        setCustomerSelection({
                          customerId: null,
                          customerName: e.target.value,
                          isCustomName: true,
                        })
                      }
                      placeholder="e.g. Rajesh Electronics, Star Distributors..."
                      disabled={isSubmitting}
                      className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-8"
                    />
                  </div>
                </div>
              ) : (
                <SearchableCustomerInput
                  customers={customers}
                  customNames={manualNames}
                  value={customerSelection}
                  onChange={setCustomerSelection}
                  disabled={isSubmitting}
                />
              )}
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Total Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-7"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              {!isDebit && !isAdvancePayment ? (
                <>
                  <Label className="text-gray-300 text-sm">
                    Pending Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pendingAmountStr === "0" ? "" : pendingAmountStr}
                      onChange={(e) => setPendingAmountStr(e.target.value)}
                      placeholder="0"
                      className={`bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-7 ${pendingAmountError ? "border-red-500/50" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {pendingAmountError && (
                    <p className="text-red-400 text-[11px] mt-1">
                      {pendingAmountError}
                    </p>
                  )}
                </>
              ) : !isAdvancePayment ? (
                <div className="flex items-center gap-2 pt-5">
                  <span className="text-[11px] text-gray-500 bg-white/[0.03] px-2 py-1 rounded-md">
                    Pending amount is not applicable for debit entries
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {safeTotal > 0 && !isDebit && !isAdvancePayment && (
            <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px]">
              <span className="text-gray-400">
                Total:{" "}
                <span className="text-white font-semibold">
                  {formatCurrencyINR(safeTotal)}
                </span>
              </span>
              <span className="text-gray-400">
                Received:{" "}
                <span className="text-emerald-400 font-semibold">
                  {formatCurrencyINR(receivedAmount)}
                </span>
              </span>
              <span className="text-gray-400">
                Pending:{" "}
                <span className="text-amber-400 font-semibold">
                  {formatCurrencyINR(safePending)}
                </span>
              </span>
            </div>
          )}
          {transactionType === "credit" && customerSelection.customerId && (
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer">
              <Checkbox
                checked={isAdvancePayment}
                onCheckedChange={(checked) => {
                  setIsAdvancePayment(checked);
                  if (checked) setPendingAmountStr("0");
                }}
                disabled={isSubmitting}
              />
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-white">
                  Advance Payment
                </h3>
              </div>
            </label>
          )}

          <div className="space-y-1">
            <Label className="text-gray-300 text-sm">
              Purpose / Item Details
            </Label>
            <textarea
              value={purpose}
              onChange={(e) => {
                if (e.target.value.length <= 400) setPurpose(e.target.value);
              }}
              rows={2}
              placeholder="e.g. Fan installation, winding payment, material purchase, advance payment..."
              className="w-full rounded-lg border border-gray-700/70 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-gray-600">
                {purpose.length}/400
              </span>
            </div>
          </div>

          <div>
            <Label className="text-gray-300 text-sm">Type</Label>
            <div
              className="flex gap-2 mt-1.5"
              role="radiogroup"
              aria-label="Transaction type">
              <button
                type="button"
                role="radio"
                aria-pressed={transactionType === "credit"}
                onClick={() => {
                  setTransactionType("credit");
                  if (pendingAmountStr === "") setPendingAmountStr("0");
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  transactionType === "credit"
                    ? "bg-emerald-600/20 text-white shadow-lg shadow-emerald-600/25"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}>
                <span className="text-xs">↑</span>
                Credit
              </button>
              <button
                type="button"
                role="radio"
                aria-pressed={transactionType === "debit"}
                onClick={() => {
                  setTransactionType("debit");
                  setPendingAmountStr("0");
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  transactionType === "debit"
                    ? "bg-red-600/20 text-white shadow-lg shadow-red-600/2"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}>
                <span className="text-xs">↓</span>
                Debit
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <Button
              type="submit"
              disabled={isSaveDisabled}
              className={`flex-1 ${isSaveDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
              {isSubmitting ? "Saving..." : "Save Entry"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(false)}
              disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Entries List */}
      {!isTechnician && (
        <div>
          {groupedByTime.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Wallet className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No entries found</p>
            </div>
          ) : (
            groupedByTime.map((bucket, bi) => (
              <div key={bucket.label || `all-${bi}`} className="mb-6 last:mb-0">
                <div className="sticky -top-4 z-10 mb-3 bg-[#0f172a]">
                  <div className=" px-3 sm:px-4 py-2.5 ">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white/90 uppercase tracking-wider">
                        {bucket.label}
                      </p>
                      <div className="flex items-center gap-3 text-sm font-medium">
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
                  </div>
                </div>
                {bucket.sections.map((section) => (
                  <div key={section.date} className="mb-5 last:mb-0">
                    <div className="px-3 sm:px-4 mb-2">
                      <p className="text-[10px] sm:text-[11px] font-medium text-white/30 uppercase tracking-wider">
                        {format(
                          new Date(section.date + "T12:00:00"),
                          "EEEE, MMMM d, yyyy",
                        )}
                      </p>
                    </div>
                    <div className="space-y-3 sm:space-y-2">
                      {section.groups.map((group) => (
                        <CashbookCustomerGroupCard
                          key={group.key}
                          group={group}
                          formatCurrency={formatCurrency}
                          onViewBill={handleViewBill}
                          onPayPending={(entry) => {
                            setPayEntry(entry);
                            setShowPayModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        bill={selectedBill}
        onDownloadPDF={() => {}}
        showShareButton={false}
        showPaymentControls={false}
      />

      {/* Pay Pending Modal */}
      <PayPendingModal
        entry={payEntry}
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setPayEntry(null);
        }}
        formatCurrency={formatCurrency}
        onSubmit={async ({ entryId, paymentAmount, paymentMethod, note }) => {
          const result = await customerCashbookService.receivePendingPayment({
            entryId,
            paymentAmount,
            paymentMethod,
            note,
          });
          if (result.success) {
            toast.success("Payment recorded successfully");
            await refreshData();
          } else {
            throw new Error(result.error || "Failed to record payment");
          }
        }}
      />
    </div>
  );
}
