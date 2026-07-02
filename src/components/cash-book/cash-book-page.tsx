"use client";

import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { useCashBookRealtime } from "@/hooks/use-cash-book-realtime";
import { sanityApiService } from "@/lib/sanity-api-service";
import { format } from "date-fns";
import {
  Plus,
  XIcon,
  Calendar,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Search,
  History,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { stockApi } from "@/lib/inventory-api";
import { toast } from "sonner";
import Link from "next/link";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { useItemSelection } from "@/hooks/use-item-selection";
import { useBrands, useCategories, useProducts } from "@/hooks/use-sanity-data";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { Badge } from "../ui/badge";
import { sanityClient } from "@/lib/sanity";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: { _id: string; name: string; phone?: string; email?: string };
  userName: string;
  amount: number;
  type: "credit" | "debit";
  source: "Manual" | "Bill Payment" | "Inventory" | "Sale";
  bill?: { _id: string; billNumber: string; customer?: { _id: string; name: string } };
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
  const { role } = useAuthStore();
  const isTechnician = role === "technician";
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<CashBookSummary>({ totalCredits: 0, totalDebits: 0, balance: 0 });
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInventorySale, setShowInventorySale] = useState(false);
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState<Record<string, { name: string; price: number; qty: number; maxQty: number }>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const { itemSelectionModal, openItemSelectionModal, closeItemSelectionModal, updateSpecificationFilter, filterItemsBySpecifications } = useItemSelection();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customUserName, setCustomUserName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
  const customNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedUserId === "other" && customNameRef.current) {
      setTimeout(() => customNameRef.current?.focus(), 100);
    }
  }, [selectedUserId]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [entriesRes, usersRes, summaryRes] = await Promise.all([
          sanityApiService.cashBook.getAllEntries(),
          sanityApiService.users.getAllUsers(),
          sanityApiService.cashBook.getSummary(),
        ]);
        if (entriesRes.success) setEntries(entriesRes.data as CashBookEntry[]);
        if (usersRes.success) setUsers(usersRes.data as User[]);
        if (summaryRes.success) setSummary(summaryRes.data as CashBookSummary);
      } catch (error) {
        console.error("Failed to load initial cash book data:", error);
      }
    };
    loadInitialData();
  }, []);

  const filteredEntries = (entries || []).filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.userName?.toLowerCase().includes(q) ||
      e.source?.toLowerCase().includes(q) ||
      e.amount.toString().includes(q)
    );
  }).slice(0, 50);

  const groupEntriesByDate = (entries: CashBookEntry[]) => {
    const groups: { [date: string]: CashBookEntry[] } = {};
    entries.forEach((entry) => {
      const date = format(new Date(entry.createdAt), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  };

  const groupedEntries = groupEntriesByDate(filteredEntries);
  const filteredItems = filterItemsBySpecifications(activeProducts);

  const saleTotal = Object.values(selectedSaleItems).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const onAddSaleItem = (p: any) => {
    setSelectedSaleItems((prev) => {
      const next = { ...prev };
      const available = Number(p?.inventory?.currentStock ?? 0) || 0;
      const defaultPrice = Number(p?.pricing?.sellingPrice || 0) || 0;
      if (available <= 0) { toast.error(`${p?.name ?? "Item"} is out of stock`); return prev; }
      const existing = next[p._id];
      if (existing) {
        next[p._id] = { ...existing, qty: Math.min(existing.qty + 1, available) };
      } else {
        next[p._id] = { name: p.name, price: defaultPrice, qty: 1, maxQty: available };
      }
      return next;
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setSelectedSaleItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return { ...prev, [itemId]: { ...current, qty: Math.max(1, Math.min(current.maxQty, Number(quantity) || 1)) } };
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
    if (items.length === 0) { toast.error("Select at least one item"); return; }
    const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    if (!(total > 0)) { toast.error("Total must be greater than 0"); return; }
    try {
      setIsAddingSale(true);
      for (const [productId, it] of Object.entries(selectedSaleItems)) {
        if (it.qty > it.maxQty) { toast.error(`Quantity for ${it.name} exceeds available stock (${it.maxQty})`); setIsAddingSale(false); return; }
        if (it.qty <= 0) { toast.error(`Quantity for ${it.name} must be at least 1`); setIsAddingSale(false); return; }
        const amount = (Number(it.qty) || 0) * (Number(it.price) || 0);
        if (!(amount > 0)) continue;
        const createdEntryRes = await sanityApiService.cashBook.createEntry({
          userName: it.name, amount, type: "credit", source: "Sale", category: "inventory",
          notes: `Cash sale: ${it.name} x${it.qty} @₹${it.price}`,
          createdAt: new Date().toISOString(), product: { _type: "reference", _ref: productId },
          quantity: Number(it.qty) || 0, unitPrice: Number(it.price) || 0,
        });
        const createdEntryId = (createdEntryRes as any)?.data?._id as string | undefined;
        const stockTxRes = await stockApi.createStockTransaction({
          productId, type: "sale", quantity: Number(it.qty) || 0, unitPrice: Number(it.price) || 0,
          notes: "Sold via Cash Book", updateInventory: true,
        });
        const stockTxId = (stockTxRes as any)?.data?._id as string | undefined;
        if (createdEntryId && stockTxId) {
          try { await sanityClient.patch(stockTxId).set({ cashBookEntry: { _type: "reference", _ref: createdEntryId } }).commit(); } catch {}
        }
      }
      toast.success("Sale items recorded in cash book");
      setShowInventorySale(false);
      setSelectedSaleItems({});
      const entriesResponse = await sanityApiService.cashBook.getAllEntries();
      if (entriesResponse.success && entriesResponse.data) setEntries(entriesResponse.data);
    } catch (e) {
      console.error("Failed to add sale record", e);
      toast.error("Failed to add sale record");
    } finally { setIsAddingSale(false); }
  };

  useCashBookRealtime({
    onEntryAdded: (newEntry) => {
      setEntries((prev) => [newEntry, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalCredits: prev.totalCredits + (newEntry.type === "credit" ? newEntry.amount : 0),
        totalDebits: prev.totalDebits + (newEntry.type === "debit" ? newEntry.amount : 0),
        balance: prev.balance + (newEntry.type === "credit" ? newEntry.amount : -newEntry.amount),
      }));
    },
    onEntryUpdated: (updatedEntry) => {
      setEntries((prev) => prev.map((entry) => (entry._id === updatedEntry._id ? updatedEntry : entry)));
    },
    onEntryDeleted: (deletedId) => {
      setEntries((prev) => {
        const deletedEntry = prev.find((entry) => entry._id === deletedId);
        if (deletedEntry) {
          setSummary((s) => ({
            ...s,
            totalCredits: s.totalCredits - (deletedEntry.type === "credit" ? deletedEntry.amount : 0),
            totalDebits: s.totalDebits - (deletedEntry.type === "debit" ? deletedEntry.amount : 0),
            balance: s.balance - (deletedEntry.type === "credit" ? deletedEntry.amount : -deletedEntry.amount),
          }));
        }
        return prev.filter((entry) => entry._id !== deletedId);
      });
    },
  });

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const handleViewBill = async (billId: string) => {
    if (!billId) { toast.error("Invalid bill ID"); return; }
    try {
      const bill = await sanityApiService.bills.getBillById(billId);
      if (bill.success && bill.data) { setSelectedBill(bill.data); setShowBillModal(true); }
      else toast.error("Failed to load bill details");
    } catch { toast.error("Error loading bill details"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error("Please enter a valid amount"); return; }
    if (!selectedUserId) { toast.error("Please select a user"); return; }
    if (selectedUserId === "other" && !customUserName.trim()) { toast.error("Please enter a name"); return; }
    setIsSubmitting(true);
    try {
      const entryData: any = { amount: parseFloat(amount), type: transactionType, source: "Manual" };
      if (selectedUserId === "other") {
        entryData.userName = customUserName.trim();
      } else {
        const selectedUser = users.find((u) => u._id === selectedUserId);
        if (!selectedUser) { toast.error("Selected user not found"); return; }
        entryData.user = { _type: "reference", _ref: selectedUserId };
        entryData.userName = selectedUser.name;
      }
      const result = await sanityApiService.cashBook.createEntry(entryData);
      if (result.success) {
        setAmount(""); setSelectedUserId(""); setCustomUserName(""); setTransactionType("credit"); setShowAddForm(false);
        toast.success(`Manual ${transactionType} entry added`);
        try {
          const [entriesRes, summaryRes] = await Promise.all([
            sanityApiService.cashBook.getAllEntries(), sanityApiService.cashBook.getSummary(),
          ]);
          if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data);
          if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
        } catch {}
      } else toast.error(result.error || "Failed to add cash book entry");
    } catch { toast.error("Failed to add cash book entry"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/cashbooks">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Books</span>
          </Button>
        </Link>
      </div>

      {/* Summary strip */}
      {!isTechnician && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-emerald-500/10 to-emerald-500/05 backdrop-blur-xl p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-[10px] sm:text-xs font-medium mb-1">
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Credits
            </div>
            <p className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">{formatCurrency(summary.totalCredits)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-red-500/10 to-red-500/05 backdrop-blur-xl p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-red-400 text-[10px] sm:text-xs font-medium mb-1">
              <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Debits
            </div>
            <p className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">{formatCurrency(summary.totalDebits)}</p>
          </div>
          <div className={`rounded-xl border border-white/[0.06] backdrop-blur-xl p-2.5 sm:p-4 bg-gradient-to-b ${summary.balance >= 0 ? "from-blue-500/10 to-blue-500/05" : "from-orange-500/10 to-orange-500/05"}`}>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium mb-1 text-blue-400">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Balance
            </div>
            <p className={`text-sm sm:text-lg md:text-xl font-bold truncate ${summary.balance >= 0 ? "text-blue-300" : "text-orange-300"}`}>
              {formatCurrency(Math.abs(summary.balance))}
              {summary.balance < 0 && <span className="text-[10px] font-normal text-orange-400 ml-1">(deficit)</span>}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-slate-100 outline-none backdrop-blur-xl placeholder:text-slate-500 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => window.location.href = "/admin/cash-book/history"} className="gap-1.5">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <Button size="sm" onClick={() => setShowInventorySale(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Sale</span>
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Record</span>
          </Button>
        </div>
      </div>

      {/* Inventory Sale Modal */}
      <BaseGlassModal isOpen={showInventorySale} onClose={() => setShowInventorySale(false)} showCloseButton={false} size="xl" mobileType="modal" zIndex={50}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] shrink-0">
          <h3 className="text-white font-semibold">Add Sale</h3>
          <button type="button" onClick={() => setShowInventorySale(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <div className="space-y-3">
            <ItemSelectionSection categories={categories} activeProducts={activeProducts} productsLoading={productsLoading} onOpenItemModal={(category) => openItemSelectionModal(category)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium text-sm">Selected Items</h4>
              <span className="text-white font-semibold">{formatCurrency(saleTotal)}</span>
            </div>
            <div className="border border-white/[0.06] rounded-lg max-h-[40vh] overflow-auto p-2 bg-white/[0.02]">
              <SelectedItemsList
                selectedItems={Object.entries(selectedSaleItems).map(([id, it]) => ({
                  id, name: it.name, price: Number(it.price) || 0, quantity: Number(it.qty) || 0,
                  total: (Number(it.qty) || 0) * (Number(it.price) || 0), category: "", brand: "",
                  specifications: "", unit: "", maxStock: Number(it.maxQty) || 0,
                }))}
                onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearAll={handleClearAll}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowInventorySale(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={submitInventorySale} disabled={isAddingSale || Object.keys(selectedSaleItems).length === 0}>
                {isAddingSale ? "Adding..." : "Add Sale"}
              </Button>
            </div>
          </div>
        </div>
        <ItemSelectionModal
          isOpen={itemSelectionModal.isOpen} onClose={closeItemSelectionModal}
          selectedCategory={itemSelectionModal.selectedCategory}
          selectedSpecifications={itemSelectionModal.selectedSpecifications}
          onUpdateSpecification={updateSpecificationFilter} filteredItems={filteredItems}
          brands={brands} onAddItem={onAddSaleItem} activeProducts={activeProducts}
        />
      </BaseGlassModal>

      {/* Add Record Modal */}
      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Add Manual Record">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300 text-sm">User</Label>
              <SelectField
                value={selectedUserId} onValueChange={(value) => { setSelectedUserId(value); if (value !== "other") setCustomUserName(""); }}
                options={[{ value: "other", label: "Other (Enter custom name)" }, ...users.map((user) => ({ value: user._id, label: user.name }))]}
                placeholder="Select user"
                className="bg-gray-800/50 border-gray-700/70 text-white"
              />
            </div>
            {selectedUserId === "other" && (
              <div>
                <Label className="text-gray-300 text-sm">Custom Name</Label>
                <Input ref={customNameRef} type="text" value={customUserName} onChange={(e) => setCustomUserName(e.target.value)}
                  placeholder="Enter customer name" className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500" />
              </div>
            )}
            <div>
              <Label className="text-gray-300 text-sm">Amount</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500" />
            </div>
          </div>
          <div>
            <Label className="text-gray-300 text-sm">Type</Label>
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={() => setTransactionType("credit")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  transactionType === "credit"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}>Credit</button>
              <button type="button" onClick={() => setTransactionType("debit")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  transactionType === "debit"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}>Debit</button>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Saving..." : "Save Entry"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Entries List */}
      {!isTechnician && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No entries found</p>
            </div>
          ) : (
            Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="sticky top-0 z-10 px-3 sm:px-4 py-2 bg-slate-950/75 shadow-lg shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/55 border-b border-white/10">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                {dateEntries.map((entry) => (
                  <div key={entry._id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      entry.type === "credit" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}>
                      {entry.type === "credit" ? <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[120px] sm:max-w-none">{entry.userName}</p>
                        <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded font-medium ${
                          entry.type === "credit"
                            ? "bg-emerald-900/30 text-emerald-300"
                            : "bg-red-900/30 text-red-300"
                        }`}>{entry.type === "credit" ? "Credit" : "Debit"}</span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 bg-white/[0.04] px-1 sm:px-1.5 py-0.5 rounded hidden xs:inline">{entry.source}</span>
                      </div>
                      {entry.bill && (
                        <button type="button" onClick={() => handleViewBill(entry.bill?._id || "")}
                          className="flex items-center gap-1 text-[10px] sm:text-[11px] text-blue-400 hover:text-blue-300 mt-0.5 transition-colors">
                          <Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="truncate max-w-[140px] sm:max-w-none">{entry.bill.billNumber || "View Bill"}</span>
                        </button>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs sm:text-sm font-semibold ${entry.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                        {entry.type === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-gray-600">{format(new Date(entry.createdAt), "hh:mm a")}</p>
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
        isOpen={showBillModal} onClose={() => setShowBillModal(false)} bill={selectedBill}
        onDownloadPDF={() => {}} showShareButton={false} showPaymentControls={false}
      />
    </div>
  );
}
