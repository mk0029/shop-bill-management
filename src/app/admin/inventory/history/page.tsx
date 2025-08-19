/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useLocaleStore } from "@/store/locale-store";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeStockSummary } from "@/components/realtime/realtime-stock-history";
import {
  Search,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  BarChart3,
  Plus,
  Minus,
  AlertTriangle,
  Loader2,
  Wifi,
  Zap,
} from "lucide-react";
import {
  stockHistoryApi,
  StockHistoryFilters,
  StockHistorySummary,
  HistoryTransaction,
} from "@/lib/stock-history-api";

const transactionTypeOptions = [
  { value: "all", label: "All Transactions" },
  { value: "purchase", label: "Purchases" },
  { value: "sale", label: "Sales" },
  { value: "adjustment", label: "Adjustments" },
];

const timeRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 3 Months" },
  { value: "365", label: "Last Year" },
];

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case "purchase":
      return "bg-green-900 text-green-300";
    case "sale":
      return "bg-blue-900 text-blue-300";
    case "adjustment":
      return "bg-yellow-900 text-yellow-300";
    default:
      return "bg-gray-900 text-gray-300";
  }
};

const getTransactionTypeIcon = (type: string) => {
  switch (type) {
    case "purchase":
      return Plus;
    case "sale":
      return Minus;
    case "adjustment":
      return AlertTriangle;
    default:
      return Package;
  }
};

export default function StockHistoryPage() {
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "quantity">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedTransaction, setSelectedTransaction] =
    useState<HistoryTransaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Real data state
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [summary, setSummary] = useState<StockHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filters
      const filters: StockHistoryFilters = {};

      if (typeFilter !== "all") {
        filters.type = typeFilter as any;
      }

      if (timeRange !== "all") {
        const daysAgo = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        filters.dateFrom = cutoffDate.toISOString();
      }

      if (debouncedSearchTerm.trim()) {
        filters.search = debouncedSearchTerm.trim();
      }

      // Fetch transactions and summary
      const [transactionsResult, summaryResult] = await Promise.all([
        stockHistoryApi.getStockTransactions(filters),
        stockHistoryApi.getStockHistorySummary(filters),
      ]);
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data || []);
      } else {
        setError(transactionsResult.error || "Failed to fetch transactions");
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, timeRange, debouncedSearchTerm]);

  // Debounce searchTerm -> debouncedSearchTerm
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Client-side sort for display
  const filteredTransactions = [...transactions].sort((a, b) => {
    let va = 0;
    let vb = 0;
    if (sortBy === "date") {
      va = new Date(a.transactionDate || a.date as any).getTime();
      vb = new Date(b.transactionDate || b.date as any).getTime();
    } else if (sortBy === "amount") {
      va = a.totalAmount || 0;
      vb = b.totalAmount || 0;
    } else {
      va = a.quantity || 0;
      vb = b.quantity || 0;
    }
    return sortOrder === "asc" ? va - vb : vb - va;
  });

  // Get summary data from API or calculate from transactions
  const totalTransactions = summary?.totalTransactions || transactions.length;
  const totalPurchaseAmount = summary?.totalPurchaseAmount || 0;
  const totalSalesAmount = summary?.totalSalesAmount || 0;
  const profit = summary?.netProfit || totalSalesAmount - totalPurchaseAmount;
  // Derived local stats needed by RealtimeStockSummary
  const totalAdjustments = transactions.filter((t) => t.type === "adjustment").length;
  const totalValue = transactions.reduce((acc, t) => acc + (t.totalAmount ?? 0), 0);
  const recentTransactions = (() => {
    const now = new Date();
    const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return transactions.filter((t) => {
      const d = t.date || (t.transactionDate ? new Date(t.transactionDate) : undefined);
      return d ? d >= last24 : false;
    }).length;
  })();

  console.log("🔍 Summary data in component:", {
    summary,
    totalPurchaseAmount,
    totalSalesAmount,
    profit,
  });

  const viewTransactionDetails = (transaction: HistoryTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };
  const containerRef = useRef(null);
  const [scrollDir, setScrollDir] = useState("down");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastY = container.scrollTop;

    const handleScroll = () => {
      const newY = container.scrollTop;
      if (newY > lastY) {
        setScrollDir("down");
      } else if (newY < lastY) {
        setScrollDir("up");
      }
      lastY = newY;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <RealtimeProvider enableNotifications={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className=" h-6 w-6 sm:w-8 sm:h-8  text-purple-400" />
              Stock History
            </h1>
            <p className="text-gray-400 mt-1">
              Track all inventory transactions with real-time updates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">Live Updates</span>
            </div>
            <Button
              variant="outline"
              onClick={fetchStockData}
              disabled={loading}
              className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="sm:p-4 p-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStockData}
                  className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-time Stock Summary */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Live Stock Transaction Statistics
          </h2>
          <RealtimeStockSummary
            summary={{
              totalTransactions,
              totalPurchases: summary?.totalPurchases || 0,
              totalSales: summary?.totalSales || 0,
              totalAdjustments,
              totalValue,
              recentTransactions,
            }}
          />
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by item name, notes, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  disabled={false}
                />
              </div>
              <div className="flex gap-3 items-center">
                <Dropdown
                  options={transactionTypeOptions}
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                  placeholder="Filter by type"
                  className="bg-gray-800 border-gray-700"
                  disabled={loading}
                />
                <Dropdown
                  options={timeRangeOptions}
                  value={timeRange}
                  onValueChange={setTimeRange}
                  placeholder="Time range"
                  className="bg-gray-800 border-gray-700"
                  disabled={loading}
                />
                {/* Sort By */}
                <Dropdown
                  options={[
                    { value: "date", label: "Date" },
                    { value: "amount", label: "Amount" },
                    { value: "quantity", label: "Quantity" },
                  ]}
                  value={sortBy}
                  onValueChange={(v: any) => setSortBy(v)}
                  placeholder="Sort by"
                  className="bg-gray-800 border-gray-700"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
                  disabled={loading}
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Transaction History removed as part of legacy cleanup */}

        {/* Legacy Transaction List (fallback) */}
        <Card className="bg-gray-900 border-gray-800 h-[95dvh] flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">
              Transaction History (Legacy)
            </CardTitle>
          </CardHeader>
          <CardContent   ref={containerRef} className="flex flex-col grow overflow-auto h-full ">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className=" h-6 w-6 sm:w-8 sm:h-8  animate-spin text-blue-400" />
                <p className="ml-3 text-gray-400">Loading transactions...</p>
              </div>
            ) : (
              <div className="space-y-4 ">
                {filteredTransactions.map((transaction) => {
                 
                    const TypeIcon = getTransactionTypeIcon(transaction.type);
                    console.log('sfdefefefekmm ce fe fe v  ve fer',transaction,'sfdefefefekmm ce fe fe v  ve fer')
                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0.1,   y: scrollDir !== "down" ? 50 : -50,filter: 'blur(1px)' }}
                      whileInView={{opacity:1,filter: 'blur(0px)',y: 0 }}
                      transition={{ duration: 0.3, ease: "linear" }} 
                      viewport={{ once: false, amount: 0.5 }}
                   
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {transaction.itemName}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {transaction.type} • {transaction.quantity} units •{" "}
                            {new Date(
                              transaction.date
                            ).toLocaleDateString()}
                          </p>
                          {transaction.notes && (
                            <p className="text-sm text-gray-500">
                              {transaction.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">
                            {currency}
                            {(transaction.totalAmount ?? 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-400">
                            {currency}
                            {(transaction.unitPrice ?? 0)} each
                          </p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getTransactionTypeColor(
                              transaction.type
                            )}`}>
                            {transaction.type}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTransactionDetails(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}

                {!loading && filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {error
                        ? "Failed to load transactions."
                        : "No transactions found matching your criteria."}
                    </p>
                    {error && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={fetchStockData}>
                        Try Again
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details Modal */}
        <Modal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          size="md"
          title={`Transaction #${selectedTransaction?.id || "Unknown"}`}>
          {selectedTransaction && (
            <div className="space-y-6 ">
              {/* Transaction Info */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">
                  Transaction Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Item</p>
                    <p className="text-white">
                      {selectedTransaction?.product?.name ?? (selectedTransaction as any)?.productName ?? "Unknown Item"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Type</p>
                    <p className="text-white capitalize">
                      {selectedTransaction.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">
                      {selectedTransaction.type === "adjustment" ? "Updated by" : "Created by"}
                    </p>
                    <p className="text-white">{selectedTransaction.createdBy ?? "Unknown"}</p>
                  </div>
                  {selectedTransaction.billNumber && (
                    <div>
                      <p className="text-gray-400">Bill</p>
                      <p className="text-white">#{selectedTransaction.billNumber}</p>
                    </div>
                  )}
                  {selectedTransaction.customerName && (
                    <div>
                      <p className="text-gray-400">Customer</p>
                      <p className="text-white">
                        {selectedTransaction.customerName}
                        {selectedTransaction.customerPhone ? ` • ${selectedTransaction.customerPhone}` : ""}
                      </p>
                    </div>
                  )}
                  {selectedTransaction.supplierName && (
                    <div>
                      <p className="text-gray-400">Supplier</p>
                      <p className="text-white">{selectedTransaction.supplierName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400">Quantity</p>
                    <p className="text-white">
                      {selectedTransaction.quantity} units
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Price per Unit</p>
                    <p className="text-white">
                      {currency}
                      {selectedTransaction.unitPrice}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Amount</p>
                    <p className="text-white font-semibold">
                      {currency}
                      {selectedTransaction.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p className="text-white">
                      {new Date(
                        selectedTransaction.transactionDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {selectedTransaction.notes && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Notes</h4>
                  <p className="text-gray-300">{selectedTransaction.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Item Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </RealtimeProvider>
  );
}
