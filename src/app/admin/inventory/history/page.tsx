/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useLocaleStore } from "@/store/locale-store";
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
} from "lucide-react";
import { StockTransaction } from "@/types";
import {
  stockHistoryApi,
  StockHistoryFilters,
  StockHistorySummary,
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<StockTransaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Real data state
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
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

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
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
  }, [typeFilter, timeRange, searchTerm]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Use real data instead of mock data
  const filteredTransactions = transactions;

  // Get summary data from API or calculate from transactions
  const totalTransactions = summary?.totalTransactions || transactions.length;
  const totalPurchases = summary?.totalPurchaseAmount || 0;
  const totalSales = summary?.totalSalesAmount || 0;
  const profit = summary?.netProfit || totalSales - totalPurchases;

  const viewTransactionDetails = (transaction: StockTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Stock History</h1>
          <p className="text-gray-400 mt-1">
            Track all inventory transactions and stock movements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStockData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const { demoStockData } = await import("@/lib/demo-stock-data");
              const result = await demoStockData.initializeDemoData();
              console.log("Demo data result:", result);
              if (result.success) {
                fetchStockData(); // Refresh data after creating demo data
              }
            }}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Demo Data
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const { debugStockHistory } = await import(
                "@/lib/stock-history-api"
              );
              await debugStockHistory();
              const { testStockHistory } = await import(
                "@/lib/test-stock-history"
              );
              await testStockHistory.runAllTests();
            }}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Debug
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStockData}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {totalTransactions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Total Purchases
                </p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {currency}
                  {totalPurchases.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {currency}
                  {totalSales.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Net Profit</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {currency}
                  {profit.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by item name, notes, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={loading}
              />
            </div>
            <div className="flex gap-3">
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
              <Button variant="outline" disabled={loading}>
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Transaction History
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="ml-3 text-gray-400">Loading transactions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => {
                const TypeIcon = getTransactionTypeIcon(transaction.type);
                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                  >
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
                          {new Date(transaction.date).toLocaleDateString()}
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
                        <p className="font-semibold text-white">
                          {currency}
                          {transaction.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          {currency}
                          {transaction.price} each
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getTransactionTypeColor(
                            transaction.type
                          )}`}
                        >
                          {transaction.type}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewTransactionDetails(transaction)}
                      >
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
                      onClick={fetchStockData}
                    >
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
        title={`Transaction #${selectedTransaction?.id}`}
      >
        {selectedTransaction && (
          <div className="space-y-6">
            {/* Transaction Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">
                Transaction Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Item</p>
                  <p className="text-white">{selectedTransaction.itemName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="text-white capitalize">
                    {selectedTransaction.type}
                  </p>
                </div>
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
                    {selectedTransaction.price}
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
                    {new Date(selectedTransaction.date).toLocaleDateString()}
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
                onClick={() => setShowTransactionModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
