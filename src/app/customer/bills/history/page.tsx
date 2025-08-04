"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useLocaleStore } from "@/store/locale-store";
import { useAuthStore } from "@/store/auth-store";
import { Search, Filter, Eye, Download, Calendar, DollarSign, Receipt, Clock, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

// Mock data - will be replaced with real data
const mockBillHistory = [
  {
    id: "1",
    amount: 2500,
    date: "2025-01-15",
    dueDate: "2025-01-30",
    status: "paid",
    items: [
      { name: "Electrical Wiring", quantity: 1, price: 1500, total: 1500 },
      { name: "Circuit Breaker", quantity: 2, price: 75, total: 150 },
      { name: "Light Fixture", quantity: 3, price: 45, total: 135 },
      { name: "Labor", quantity: 1, price: 715, total: 715 },
    ],
    serviceType: "Installation",
    location: "Residential",
    paymentDate: "2025-01-20",
  },
  {
    id: "2",
    amount: 1800,
    date: "2025-01-14",
    dueDate: "2025-01-29",
    status: "pending",
    items: [
      { name: "Outlet Installation", quantity: 4, price: 60, total: 240 },
      { name: "Switch Installation", quantity: 3, price: 50, total: 150 },
      { name: "Labor", quantity: 1, price: 1410, total: 1410 },
    ],
    serviceType: "Repair",
    location: "Residential",
    paymentDate: null,
  },
  {
    id: "3",
    amount: 3200,
    date: "2025-01-13",
    dueDate: "2025-01-28",
    status: "paid",
    items: [
      { name: "Electrical Panel", quantity: 1, price: 300, total: 300 },
      { name: "Electrical Wiring", quantity: 1, price: 1500, total: 1500 },
      { name: "Labor", quantity: 1, price: 1400, total: 1400 },
    ],
    serviceType: "Installation",
    location: "Commercial",
    paymentDate: "2025-01-25",
  },
  {
    id: "4",
    amount: 1500,
    date: "2025-01-12",
    dueDate: "2025-01-27",
    status: "overdue",
    items: [
      { name: "Light Fixture", quantity: 5, price: 45, total: 225 },
      { name: "Labor", quantity: 1, price: 1275, total: 1275 },
    ],
    serviceType: "Maintenance",
    location: "Residential",
    paymentDate: null,
  },
  {
    id: "5",
    amount: 2200,
    date: "2025-01-10",
    dueDate: "2025-01-25",
    status: "paid",
    items: [
      { name: "Emergency Repair", quantity: 1, price: 500, total: 500 },
      { name: "Parts Replacement", quantity: 1, price: 300, total: 300 },
      { name: "Labor", quantity: 1, price: 1400, total: 1400 },
    ],
    serviceType: "Emergency",
    location: "Residential",
    paymentDate: "2025-01-12",
  },
  {
    id: "6",
    amount: 900,
    date: "2025-01-08",
    dueDate: "2025-01-23",
    status: "paid",
    items: [
      { name: "Inspection", quantity: 1, price: 200, total: 200 },
      { name: "Minor Repairs", quantity: 1, price: 400, total: 400 },
      { name: "Labor", quantity: 1, price: 300, total: 300 },
    ],
    serviceType: "Inspection",
    location: "Residential",
    paymentDate: "2025-01-15",
  },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

const timeRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 3 Months" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-900 text-green-300";
    case "pending":
      return "bg-yellow-900 text-yellow-300";
    case "overdue":
      return "bg-red-900 text-red-300";
    default:
      return "bg-gray-900 text-gray-300";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return CheckCircle;
    case "pending":
      return Clock;
    case "overdue":
      return AlertCircle;
    default:
      return Receipt;
  }
};

export default function CustomerBillHistoryPage() {
  const { t, currency } = useLocaleStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  const filteredBills = mockBillHistory.filter(bill => {
    const matchesSearch = bill.id.includes(searchTerm) ||
                         bill.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
    
    // Time range filtering
    let matchesTime = true;
    if (timeRange !== "all") {
      const daysAgo = parseInt(timeRange);
      const billDate = new Date(bill.date);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      matchesTime = billDate >= cutoffDate;
    }
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const totalSpent = mockBillHistory.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + bill.amount, 0);
  const totalBills = mockBillHistory.length;
  const paidBills = mockBillHistory.filter(bill => bill.status === "paid").length;
  const averageBillAmount = totalBills > 0 ? totalSpent / totalBills : 0;

  // Calculate monthly spending trend
  const monthlyData = mockBillHistory
    .filter(bill => bill.status === "paid")
    .reduce((acc, bill) => {
      const month = new Date(bill.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      acc[month] = (acc[month] || 0) + bill.amount;
      return acc;
    }, {} as Record<string, number>);

  const monthlyTrend = Object.values(monthlyData);
  const isTrendingUp = monthlyTrend.length >= 2 && 
    monthlyTrend[monthlyTrend.length - 1] > monthlyTrend[monthlyTrend.length - 2];

  const viewBillDetails = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Bill History</h1>
        <p className="text-gray-400 mt-1">
          View your complete billing history and payment records
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-white mt-1">{currency}{totalSpent.toLocaleString()}</p>
                <div className="flex items-center mt-2 text-sm">
                  {isTrendingUp ? (
                    <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                  )}
                  <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                    {isTrendingUp ? "Increasing" : "Decreasing"}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Bills</p>
                <p className="text-2xl font-bold text-white mt-1">{totalBills}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {paidBills} paid, {totalBills - paidBills} pending
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Average Bill</p>
                <p className="text-2xl font-bold text-white mt-1">{currency}{averageBillAmount.toFixed(0)}</p>
                <p className="text-sm text-gray-400 mt-1">Per bill</p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Payment Rate</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{((paidBills / totalBills) * 100).toFixed(0)}%</p>
                <p className="text-sm text-gray-400 mt-1">Bills paid on time</p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
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
                placeholder="Search by bill ID, service type, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <Dropdown
                options={statusOptions}
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Filter by status"
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

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Bill History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBills.map((bill) => {
              const StatusIcon = getStatusIcon(bill.status);
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <StatusIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Bill #{bill.id}</h3>
                      <p className="text-sm text-gray-400">{bill.serviceType} • {bill.location}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(bill.date).toLocaleDateString()} - Due: {new Date(bill.dueDate).toLocaleDateString()}
                      </p>
                      {bill.paymentDate && (
                        <p className="text-sm text-green-400">
                          Paid: {new Date(bill.paymentDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-white">{currency}{bill.amount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bill.status)}`}>
                        {bill.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewBillDetails(bill)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredBills.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No bills found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill #${selectedBill?.id} - ${selectedBill?.serviceType}`}
      >
        {selectedBill && (
          <div className="space-y-6">
            {/* Bill Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Bill Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Service Type</p>
                  <p className="text-white">{selectedBill.serviceType}</p>
                </div>
                <div>
                  <p className="text-gray-400">Location</p>
                  <p className="text-white">{selectedBill.location}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Date</p>
                  <p className="text-white">{new Date(selectedBill.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Due Date</p>
                  <p className="text-white">{new Date(selectedBill.dueDate).toLocaleDateString()}</p>
                </div>
                {selectedBill.paymentDate && (
                  <div>
                    <p className="text-gray-400">Payment Date</p>
                    <p className="text-green-400">{new Date(selectedBill.paymentDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Items */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Bill Items</h4>
              <div className="space-y-3">
                {selectedBill.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <div>
                      <p className="text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">
                        {item.quantity} × {currency}{item.price}
                      </p>
                    </div>
                    <p className="font-semibold text-white">{currency}{item.total}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">Total Amount</span>
                <span className="text-2xl font-bold text-white">{currency}{selectedBill.amount.toLocaleString()}</span>
              </div>
              <div className="mt-2">
                <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedBill.status)}`}>
                  {selectedBill.status}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setShowBillModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 