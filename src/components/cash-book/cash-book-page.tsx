"use client";

import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { useCashBookRealtime } from "@/hooks/use-cash-book-realtime";
import { sanityApiService } from "@/lib/sanity-api-service";
import {
  syncBillPaymentsToCashBook,
  getSyncStatistics,
} from "@/lib/bill-payment-sync";
import { format } from "date-fns";
import {
  DollarSign,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  XIcon,
  Calendar,
  RefreshCw,
  Trash,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { stockApi } from "@/lib/inventory-api";
import { toast } from "sonner";
import ResponsiveAccordion from "../ui/responsive-accordion";
import Link from "next/link";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { useItemSelection } from "@/hooks/use-item-selection";
import { useBrands, useCategories, useProducts } from "@/hooks/use-sanity-data";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { Badge } from "../ui/badge";
import { sanityClient } from "@/lib/sanity";
import { Modal } from "@/components/ui/modal";

interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  userName: string;
  amount: number;
  type: "credit" | "debit";
  source: "Manual" | "Bill Payment" | "Inventory" | "Sale";
  bill?: {
    _id: string;
    billNumber: string;
    customer?: {
      _id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // Inventory sale modal state
  const [showInventorySale, setShowInventorySale] = useState(false);
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState<
    Record<string, { name: string; price: number; qty: number; maxQty: number }>
  >({});

  // Shared item selection (reuse Billing components)
  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customUserName, setCustomUserName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "credit",
  );

  // Ref for custom name input
  const customNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus custom name input when "Other" is selected
  useEffect(() => {
    if (selectedUserId === "other" && customNameRef.current) {
      setTimeout(() => {
        customNameRef.current?.focus();
      }, 100);
    }
  }, [selectedUserId || ""]);

  // Load initial data from client
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [entriesRes, usersRes, summaryRes] = await Promise.all([
          sanityApiService.cashBook.getAllEntries(),
          sanityApiService.users.getAllUsers(),
          sanityApiService.cashBook.getSummary(),
        ]);

        if (entriesRes.success) {
          setEntries(entriesRes.data as CashBookEntry[]);
        }
        if (usersRes.success) {
          setUsers(usersRes.data as User[]);
        }
        if (summaryRes.success) {
          setSummary(summaryRes.data as CashBookSummary);
        }
      } catch (error) {
        console.error("Failed to load initial cash book data:", error);
      }
    };

    loadInitialData();
  }, []);

  // Pagination - show only 20 entries
  const displayedEntries = (entries || []).slice(0, 20);

  // Group entries by date for date separators
  const groupEntriesByDate = (entries: CashBookEntry[]) => {
    const groups: { [date: string]: CashBookEntry[] } = {};

    entries.forEach((entry) => {
      const date = format(new Date(entry.createdAt), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return groups;
  };

  const groupedEntries = groupEntriesByDate(displayedEntries);

  const filteredItems = filterItemsBySpecifications(activeProducts);

  const saleTotal = Object.values(selectedSaleItems).reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0,
  );

  const onAddSaleItem = (p: any) => {
    setSelectedSaleItems((prev) => {
      const next = { ...prev } as typeof prev;
      const available = Number(p?.inventory?.currentStock ?? 0) || 0;
      const defaultPrice = Number(p?.pricing?.sellingPrice || 0) || 0;
      if (available <= 0) {
        toast.error(`${p?.name ?? "Item"} is out of stock`);
        return prev;
      }
      const existing = next[p._id];
      if (existing) {
        const newQty = Math.min(existing.qty + 1, available);
        next[p._id] = { ...existing, qty: newQty };
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
      const clamped = Math.max(
        1,
        Math.min(current.maxQty, Number(quantity) || 1),
      );
      return { ...prev, [itemId]: { ...current, qty: clamped } };
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
      // Validate stock limits before submitting
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
      }
      // Create one entry + stock transaction per item and cross-link them
      for (const [productId, it] of Object.entries(selectedSaleItems)) {
        const amount = (Number(it.qty) || 0) * (Number(it.price) || 0);
        if (!(amount > 0)) continue;
        // 1) Cash book credit entry
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

        // 2) Inventory deduction via stock transaction (sale)
        const stockTxRes = await stockApi.createStockTransaction({
          productId,
          type: "sale",
          quantity: Number(it.qty) || 0,
          unitPrice: Number(it.price) || 0,
          notes: "Sold via Cash Book",
          updateInventory: true,
        });

        const stockTxId = (stockTxRes as any)?.data?._id as string | undefined;

        // 3) Patch only the stock transaction to reference the cash book entry (avoid circular references)
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
      // Refresh list to show new entries at top
      const entriesResponse = await sanityApiService.cashBook.getAllEntries();
      if (entriesResponse.success && entriesResponse.data) {
        setEntries(entriesResponse.data);
      }
    } catch (e) {
      console.error("Failed to add sale record", e);
      toast.error("Failed to add sale record");
    } finally {
      setIsAddingSale(false);
    }
  };

  // Real-time updates
  const { isConnected } = useCashBookRealtime({
    onEntryAdded: (newEntry) => {
      setEntries((prev) => [newEntry, ...prev]);
      // Update summary
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
      // Recalculate summary
      setEntries((currentEntries) => {
        const newSummary = (currentEntries || []).reduce(
          (acc, entry) => {
            if (entry.type === "credit") {
              acc.totalCredits += entry.amount;
            } else if (entry.type === "debit") {
              acc.totalDebits += entry.amount;
            }
            return acc;
          },
          { totalCredits: 0, totalDebits: 0, balance: 0 },
        );

        newSummary.balance = newSummary.totalCredits - newSummary.totalDebits;
        setSummary(newSummary);
        return currentEntries;
      });
    },
    onEntryDeleted: (deletedId) => {
      setEntries((prev) => {
        const deletedEntry = prev.find((entry) => entry._id === deletedId);
        if (deletedEntry) {
          // Update summary
          setSummary((summary) => ({
            ...summary,
            totalCredits:
              summary.totalCredits -
              (deletedEntry.type === "credit" ? deletedEntry.amount : 0),
            totalDebits:
              summary.totalDebits -
              (deletedEntry.type === "debit" ? deletedEntry.amount : 0),
            balance:
              summary.balance -
              (deletedEntry.type === "credit"
                ? deletedEntry.amount
                : -deletedEntry.amount),
          }));
        }
        return prev.filter((entry) => entry._id !== deletedId);
      });
    },
  });

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Handle bill detail view
  const handleViewBill = async (billId: string) => {
    if (!billId) {
      toast.error("Invalid bill ID");
      return;
    }

    try {
      // Fetch the bill details
      const bill = await sanityApiService.bills.getBillById(billId);
      if (bill.success && bill.data) {
        setSelectedBill(bill.data);
        setShowBillModal(true);
      } else {
        toast.error("Failed to load bill details");
      }
    } catch (error) {
      console.error("Error viewing bill:", error);
      toast.error("Error loading bill details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    if (selectedUserId === "other" && !customUserName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setIsSubmitting(true);

    try {
      let entryData: any = {
        amount: parseFloat(amount),
        type: transactionType,
        source: "Manual",
      };

      if (selectedUserId === "other") {
        // Use custom name directly without user reference
        entryData.userName = customUserName.trim();
      } else {
        // Use existing user reference
        const selectedUser = users.find((u) => u._id === selectedUserId);
        if (!selectedUser) {
          toast.error("Selected user not found");
          return;
        }
        entryData.user = {
          _type: "reference",
          _ref: selectedUserId,
        };
        entryData.userName = selectedUser.name;
      }

      const result = await sanityApiService.cashBook.createEntry(entryData);

      if (result.success) {
        // Reset form
        setAmount("");
        setSelectedUserId("");
        setCustomUserName("");
        setTransactionType("credit");
        setShowAddForm(false);

        toast.success(
          `Manual ${transactionType} entry of ${formatCurrency(parseFloat(amount))} added successfully`,
        );

        // Refresh list & summary so UI updates even if realtime misses an event
        try {
          const [entriesRes, summaryRes] = await Promise.all([
            sanityApiService.cashBook.getAllEntries(),
            sanityApiService.cashBook.getSummary(),
          ]);
          if (entriesRes.success && entriesRes.data) {
            setEntries(entriesRes.data as CashBookEntry[]);
          }
          if (summaryRes.success && summaryRes.data) {
            setSummary(summaryRes.data as CashBookSummary);
          }
        } catch {}
      } else {
        toast.error(result.error || "Failed to add cash book entry");
      }
    } catch (error) {
      console.error("Error adding cash book entry:", error);
      toast.error("Failed to add cash book entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = users.find((u) => u._id === selectedUserId);

  return (
    <div className="min-h-screen bg-gray-900 rounded-lg max-md:p-3">
      <ResponsiveAccordion
        defaultOpenMobile={false}
        // removePX
        title={
          <CardHeader className="!p-0">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Cash Book
              </h1>
              <div className="flex items-center gap-2">
                <Link href="/admin/cashbooks">
                  <Button size="sm" variant="secondary">
                    Visit Books
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        }
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"></div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Credits</p>
                  <p className="text-green-400 text-xl font-bold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {formatCurrency(summary.totalCredits)}
                  </p>
                </div>
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Debits</p>
                  <p className="text-red-400 text-xl font-bold flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    {formatCurrency(summary.totalDebits)}
                  </p>
                </div>
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Balance</p>
                  <p
                    className={`text-xl font-bold flex items-center gap-1 ${
                      summary.balance >= 0 ? "text-blue-400" : "text-orange-400"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {formatCurrency(Math.abs(summary.balance))}
                    {summary.balance < 0 && " (Deficit)"}
                  </p>
                </div>
                <div
                  className={`${summary.balance >= 0 ? "bg-blue-500/20" : "bg-orange-500/20"} p-2 rounded-lg`}
                >
                  <DollarSign
                    className={`w-6 h-6 ${summary.balance >= 0 ? "text-blue-500" : "text-orange-500"}`}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </ResponsiveAccordion>
      <div className=" mx-auto space-y-4 sm:space-y-6 pt-6 md:px-3">
        {/* Add Record, Sync & History Buttons */}
        <div className="flex w-full gap-2">
          {/* <Button
              onClick={handleSyncBillPayments}
              disabled={isSyncing}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Payments'}
            </Button> */}
          <Button
            onClick={() => (window.location.href = "/admin/cash-book/history")}
            className="bg-gray-600 hover:bg-gray-700 text-white flex w-full items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span className="max-sm:hidden">View</span> History
          </Button>
          <Button
            onClick={() => setShowInventorySale(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex w-full items-center gap-2"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="max-sm:hidden">Add</span> Sale
          </Button>
          {/* <Button
              onClick={handleClearBook}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700 text-white flex w-full items-center gap-2"
            >
              <Trash className={`w-4 h-4 ${isClearing ? 'animate-pulse' : ''}`} />
              {isClearing ? 'Clearing...' : 'Clear Book'}
            </Button> */}
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full flex items-center gap-2"
          >
            {showAddForm ? (
              <>
                <XIcon className="w-4 h-4" /> Close
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />{" "}
                <span className="max-sm:hidden">Add</span> Record
              </>
            )}
          </Button>
        </div>

        {/* Inventory Sale Modal (moved outside of buttons to avoid click bubbling) */}
        {showInventorySale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={(e) => {
                e.stopPropagation();
                setShowInventorySale(false);
              }}
            ></div>
            <div
              className="relative bg-gray-800 border border-gray-700 rounded-lg w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">
                  Add Sale (Select Items)
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowInventorySale(false)}
                  className="text-gray-300"
                >
                  Close
                </Button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <ItemSelectionSection
                    categories={categories}
                    activeProducts={activeProducts}
                    productsLoading={productsLoading}
                    onOpenItemModal={(category) =>
                      openItemSelectionModal(category)
                    }
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Selected Items</h4>
                    <div className="text-white font-semibold">
                      Total: {formatCurrency(saleTotal)}
                    </div>
                  </div>
                  <div className="border border-gray-700 rounded-md max-h-[50vh] overflow-auto p-2">
                    <SelectedItemsList
                      selectedItems={Object.entries(selectedSaleItems).map(
                        ([id, it]) => ({
                          id,
                          name: it.name,
                          price: Number(it.price) || 0,
                          quantity: Number(it.qty) || 0,
                          total:
                            (Number(it.qty) || 0) * (Number(it.price) || 0),
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
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="bg-gray-700 border-gray-600 text-gray-200"
                      onClick={() => setShowInventorySale(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className={`bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 ${isAddingSale ? "opacity-80 cursor-not-allowed" : ""}`}
                      onClick={submitInventorySale}
                      disabled={
                        isAddingSale ||
                        Object.keys(selectedSaleItems).length === 0
                      }
                    >
                      {isAddingSale ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                          Adding...
                        </>
                      ) : (
                        <>Add Sale</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              {/* Shared modal to pick items from category */}
              <ItemSelectionModal
                isOpen={itemSelectionModal.isOpen}
                onClose={closeItemSelectionModal}
                selectedCategory={itemSelectionModal.selectedCategory}
                selectedSpecifications={
                  itemSelectionModal.selectedSpecifications
                }
                onUpdateSpecification={updateSpecificationFilter}
                filteredItems={filteredItems}
                brands={brands}
                onAddItem={onAddSaleItem}
                activeProducts={activeProducts}
              />
            </div>
          </div>
        )}

        {/* Add Record Form */}
        <Modal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Add Manual Record"
        >
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="user" className="text-gray-300 text-sm">
                  User
                </Label>
                <SelectField
                  value={selectedUserId}
                  onValueChange={(value) => {
                    setSelectedUserId(value);
                    if (value !== "other") {
                      setCustomUserName("");
                    }
                  }}
                  options={[
                    { value: "other", label: "Other (Enter custom name)" },
                    ...users.map((user) => ({
                      value: user._id,
                      label: user.name,
                    })),
                  ]}
                  placeholder="Select user"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {selectedUserId === "other" && (
                <div>
                  <Label htmlFor="customName" className="text-gray-300 text-sm">
                    Custom Name
                  </Label>
                  <Input
                    ref={customNameRef}
                    id="customName"
                    type="text"
                    value={customUserName}
                    onChange={(e) => setCustomUserName(e.target.value)}
                    placeholder="Enter customer name"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="amount" className="text-gray-300 text-sm">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Transaction Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={transactionType === "credit" ? "default" : "outline"}
                  onClick={() => setTransactionType("credit")}
                  className={`flex-1 ${
                    transactionType === "credit"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Credit
                </Button>
                <Button
                  type="button"
                  variant={transactionType === "debit" ? "default" : "outline"}
                  onClick={() => setTransactionType("debit")}
                  className={`flex-1 ${
                    transactionType === "debit"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Debit
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                {isSubmitting ? "Saving..." : "Save Entry"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>

        {/* Records Table - Desktop View */}
        <div className="hidden lg:block">
          <Card className="bg-gray-800 border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Cash Book Records (Latest 20)
              </h3>
            </div>
            <div className="overflow-x-auto">
              {Object.keys(groupedEntries).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No cash book entries found</p>
                </div>
              ) : (
                Object.entries(groupedEntries).map(([date, dateEntries]) => (
                  <div key={date}>
                    {/* Date Separator */}
                    <div className="border-t border-gray-600 my-2"></div>
                    <div className="px-4 py-2 bg-gray-700/50">
                      <p className="text-sm font-medium text-gray-300">
                        {format(new Date(date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-4 text-gray-400 font-medium">
                            User
                          </th>
                          <th className="text-left p-4 text-gray-400 font-medium">
                            Amount
                          </th>
                          <th className="text-left p-4 text-gray-400 font-medium">
                            Type
                          </th>
                          <th className="text-left p-4 text-gray-400 font-medium">
                            Source
                          </th>
                          <th className="text-left p-4 text-gray-400 font-medium">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateEntries.map((entry) => (
                          <tr
                            key={entry._id}
                            className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">
                                  {entry.userName}
                                </p>
                                {entry.user?.phone && (
                                  <p className="text-gray-400 text-sm">
                                    {entry.user.phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p
                                className={`font-bold ${
                                  entry.type === "credit"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {entry.type === "credit" ? "+" : "-"}
                                {formatCurrency(entry.amount)}
                              </p>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  entry.type === "credit"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  entry.type === "credit"
                                    ? "bg-green-600 text-white"
                                    : "bg-red-600 text-white"
                                }
                              >
                                {entry.type === "credit" ? "Credit" : "Debit"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-gray-600 text-gray-300"
                                >
                                  {entry.source}
                                </Badge>
                                {entry.bill && (
                                  <>
                                    {/* <span className="text-gray-400 text-sm">
                                      Bill: {entry.bill.billNumber}
                                    </span> */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-xs border-blue-600 text-blue-400 hover:bg-blue-600/20"
                                    >
                                      Check Bill
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-300">
                                {format(new Date(entry.createdAt), "hh:mm a")}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Records Cards - Mobile View */}
        <div className="lg:hidden">
          {Object.keys(groupedEntries).length === 0 ? (
            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <p className="text-gray-400">No cash book entries found</p>
            </Card>
          ) : (
            Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date} className="mb-4">
                {/* Date Separator */}
                <div className="border-t border-gray-600 my-2"></div>
                <div className="px-4 py-2 bg-gray-700/50 rounded-md">
                  <p className="text-sm font-medium text-gray-300">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <div className="space-y-1 mt-2">
                  {dateEntries.map((entry, index) => (
                    <Card
                      key={entry._id}
                      className={`bg-gray-800 border-gray-700 p-4 ${index === 0 ? "rounded-none rounded-t-lg" : dateEntries.length - 1 === index ? "rounded-none rounded-b-lg" : "rounded-none "}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-medium">
                            {entry.userName}
                          </h4>
                          {entry.user?.phone && (
                            <p className="text-gray-400 text-sm">
                              {entry.user.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-lg ${
                              entry.type === "credit"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {entry.type === "credit" ? "+" : "-"}
                            {formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            entry.type === "credit" ? "default" : "destructive"
                          }
                          className={
                            entry.type === "credit"
                              ? "bg-green-600 text-white text-xs"
                              : "bg-red-600 text-white text-xs"
                          }
                        >
                          {entry.type === "credit" ? "Credit" : "Debit"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-gray-600 text-gray-300 text-xs"
                        >
                          {entry.source}
                        </Badge>
                        {entry.bill && (
                          <>
                            {/* <span className="text-gray-400 text-xs">
                              Bill: {entry.bill.billNumber}
                            </span> */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleViewBill(entry.bill?._id || "")
                              }
                              className="h-5 px-2 text-xs border-blue-600 text-blue-400 hover:bg-blue-600/20"
                            >
                              <Receipt className="w-2 h-2 mr-1" />
                              View
                            </Button>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">
                        {format(new Date(entry.createdAt), "hh:mm a")}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Detail Modal */}
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
