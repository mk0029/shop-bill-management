"use client";

import { useState } from "react";
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
  Calendar,
  DollarSign,
  BarChart3,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react";
import { StockTransaction } from "@/types";

// Mock data - will be replaced with real data
const mockTransactions: StockTransaction[] = [
  {
    id: "1",
    itemId: "1",
    itemName: "LED Bulb - Philips 5W White",
    type: "purchase",
    quantity: 50,
    price: 67,
    totalAmount: 3350,
    date: new Date("2025-01-15"),
    notes: "Initial stock purchase",
    createdBy: "admin",
  },
  {
    id: "2",
    itemId: "1",
    itemName: "LED Bulb - Philips 5W White",
    type: "sale",
    quantity: 3,
    price: 90,
    totalAmount: 270,
    date: new Date("2025-01-16"),
    notes: "Sold to customer John Doe",
    createdBy: "admin",
  },
  {
    id: "3",
    itemId: "1",
    itemName: "LED Bulb - Philips 5W White",
    type: "sale",
    quantity: 2,
    price: 90,
    totalAmount: 180,
    date: new Date("2025-01-17"),
    notes: "Sold to customer Jane Smith",
    createdBy: "admin",
  },
  {
    id: "4",
    itemId: "2",
    itemName: "LED Bulb - Havells 5W Warm White",
    type: "purchase",
    quantity: 30,
    price: 69,
    totalAmount: 2070,
    date: new Date("2025-01-14"),
    notes: "Stock replenishment",
    createdBy: "admin",
  },
  {
    id: "5",
    itemId: "2",
    itemName: "LED Bulb - Havells 5W Warm White",
    type: "sale",
    quantity: 1,
    price: 95,
    totalAmount: 95,
    date: new Date("2025-01-18"),
    notes: "Sold to customer Mike Johnson",
    createdBy: "admin",
  },
  {
    id: "6",
    itemId: "3",
    itemName: "Panel Light - Crompton 12W Medium",
    type: "purchase",
    quantity: 20,
    price: 120,
    totalAmount: 2400,
    date: new Date("2025-01-13"),
    notes: "New product addition",
    createdBy: "admin",
  },
  {
    id: "7",
    itemId: "4",
    itemName: "Electric Wire - Finolex 1.5mm",
    type: "purchase",
    quantity: 200,
    price: 45,
    totalAmount: 9000,
    date: new Date("2025-01-12"),
    notes: "Bulk purchase for project",
    createdBy: "admin",
  },
  {
    id: "8",
    itemId: "4",
    itemName: "Electric Wire - Finolex 1.5mm",
    type: "sale",
    quantity: 50,
    price: 65,
    totalAmount: 3250,
    date: new Date("2025-01-19"),
    notes: "Sold for wiring project",
    createdBy: "admin",
  },
];

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
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = 
      transaction.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.includes(searchTerm);
    
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    // Time range filtering
    let matchesTime = true;
    if (timeRange !== "all") {
      const daysAgo = parseInt(timeRange);
      const transactionDate = new Date(transaction.date);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      matchesTime = transactionDate >= cutoffDate;
    }
    
    return matchesSearch && matchesType && matchesTime;
  });

  const totalPurchases = mockTransactions
    .filter(t => t.type === "purchase")
    .reduce((sum, t) => sum + t.totalAmount, 0);
  
  const totalSales = mockTransactions
    .filter(t => t.type === "sale")
    .reduce((sum, t) => sum + t.totalAmount, 0);
  
  const totalTransactions = mockTransactions.length;
  const profit = totalSales - totalPurchases;

  const viewTransactionDetails = (transaction: StockTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Stock History</h1>
        <p className="text-gray-400 mt-1">
          Track all inventory transactions and stock movements
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Transactions</p>
                <p className="text-2xl font-bold text-white mt-1">{totalTransactions}</p>
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
                <p className="text-gray-400 text-sm font-medium">Total Purchases</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{currency}{totalPurchases.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-blue-400 mt-1">{currency}{totalSales.toLocaleString()}</p>
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
                <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currency}{profit.toLocaleString()}
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
              />
            </div>
            <div className="flex gap-3">
              <Dropdown
                options={transactionTypeOptions}
                value={typeFilter}
                onValueChange={setTypeFilter}
                placeholder="Filter by type"
                className="bg-gray-800 border-gray-700"
              />
              <Dropdown
                options={timeRangeOptions}
                value={timeRange}
                onValueChange={setTimeRange}
                placeholder="Time range"
                className="bg-gray-800 border-gray-700"
              />
              <Button variant="outline">
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
          <CardTitle className="text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
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
                      <h3 className="font-medium text-white">{transaction.itemName}</h3>
                      <p className="text-sm text-gray-400">
                        {transaction.type} • {transaction.quantity} units • {new Date(transaction.date).toLocaleDateString()}
                      </p>
                      {transaction.notes && (
                        <p className="text-sm text-gray-500">{transaction.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-white">{currency}{transaction.totalAmount.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">{currency}{transaction.price} each</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getTransactionTypeColor(transaction.type)}`}>
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
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No transactions found matching your criteria.</p>
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
              <h4 className="font-medium text-white mb-3">Transaction Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Item</p>
                  <p className="text-white">{selectedTransaction.itemName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="text-white capitalize">{selectedTransaction.type}</p>
                </div>
                <div>
                  <p className="text-gray-400">Quantity</p>
                  <p className="text-white">{selectedTransaction.quantity} units</p>
                </div>
                <div>
                  <p className="text-gray-400">Price per Unit</p>
                  <p className="text-white">{currency}{selectedTransaction.price}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Amount</p>
                  <p className="text-white font-semibold">{currency}{selectedTransaction.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="text-white">{new Date(selectedTransaction.date).toLocaleDateString()}</p>
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
              <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 