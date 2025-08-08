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
import { useBills } from "@/hooks/use-sanity-data";
import {
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  DollarSign,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { BillItem, Bill } from "@/types";

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
  const { getBillsByCustomer } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Get real bills for the current customer
  const allBills = user ? getBillsByCustomer(user.id) : [];

  // Filter bills by search, status, and time range
  const filteredBills = allBills.filter((bill) => {
    const matchesSearch =
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.locationType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      bill.paymentStatus === statusFilter ||
      bill.status === statusFilter;
    // Time range filtering
    let matchesTime = true;
    if (timeRange !== "all") {
      const daysAgo = parseInt(timeRange);
      const billDate = new Date(bill.serviceDate);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      matchesTime = billDate >= cutoffDate;
    }
    return matchesSearch && matchesStatus && matchesTime;
  });

  const totalSpent = allBills
    .filter((bill) => bill.paymentStatus === "paid")
    .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  const totalBills = allBills.length;
  const paidBills = allBills.filter(
    (bill) => bill.paymentStatus === "paid"
  ).length;
  const averageBillAmount = totalBills > 0 ? totalSpent / totalBills : 0;

  // Calculate monthly spending trend
  const monthlyData = allBills
    .filter((bill) => bill.paymentStatus === "paid")
    .reduce((acc, bill) => {
      const month = new Date(bill.serviceDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
      acc[month] = (acc[month] || 0) + (bill.totalAmount || 0);
      return acc;
    }, {} as Record<string, number>);
  const monthlyTrend = Object.values(monthlyData);
  const isTrendingUp =
    monthlyTrend.length >= 2 &&
    monthlyTrend[monthlyTrend.length - 1] >
      monthlyTrend[monthlyTrend.length - 2];

  const viewBillDetails = (bill: Bill) => {
    console.log("Selected bill:", bill);
    console.log("Bill items:", bill.items);
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
      <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 sm:gap-4 gap-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Total Spent
                </p>
                <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                  {currency}
                  {totalSpent.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {isTrendingUp ? (
                    <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                  )}
                  <span
                    className={isTrendingUp ? "text-green-400" : "text-red-400"}
                  >
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
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Total Bills
                </p>
                <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                  {totalBills}
                </p>
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
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Average Bill
                </p>
                <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                  {currency}
                  {averageBillAmount.toFixed(0)}
                </p>
                <p className="text-sm text-gray-400 mt-1">Per bill</p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Payment Rate
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-green-400 mt-1">
                  {((paidBills / totalBills) * 100).toFixed(0)}%
                </p>
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
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by bill number, service type, or location..."
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
              const StatusIcon = getStatusIcon(
                bill.paymentStatus || bill.status
              );
              return (
                <motion.div
                  key={bill._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <StatusIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">
                        Bill #{bill.billNumber}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {bill.serviceType} {bill.locationType}
                      </p>
                      <p className="text-sm text-gray-400">
                        {bill.serviceDate
                          ? new Date(bill.serviceDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {currency}
                        {(bill.totalAmount || 0).toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          bill.paymentStatus || bill.status
                        )}`}
                      >
                        {bill.paymentStatus || bill.status}
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
                      <Button variant="outline" size="sm">
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
              <p className="text-gray-400">
                No bills found matching your criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill #${selectedBill?.billNumber} - ${selectedBill?.serviceType}`}
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
                  <p className="text-white">{selectedBill.locationType}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Date</p>
                  <p className="text-white">
                    {selectedBill.serviceDate
                      ? new Date(selectedBill.serviceDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="text-white">
                    {selectedBill.paymentStatus || selectedBill.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Items */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Bill Items</h4>
              <div className="space-y-3">
                {selectedBill.items &&
                Array.isArray(selectedBill.items) &&
                selectedBill.items.length > 0 ? (
                  selectedBill.items.map((item: BillItem, index: number) => {
                    // Add null checks and debugging
                    if (!item) {
                      console.warn(
                        `Item at index ${index} is null or undefined`
                      );
                      return null;
                    }

                    console.log("Processing item:", item);

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0"
                      >
                        <div>
                          <p className="text-white">
                            {item.productName || "Product"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {item.quantity || 0} × {currency}
                            {item.unitPrice || 0}
                          </p>
                          {item.specifications && (
                            <p className="text-xs text-gray-500">
                              {item.specifications}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-white">
                          {currency}
                          {(item.totalPrice || 0).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400">No items found.</p>
                )}
              </div>
            </div>

            {/* Charges & Totals */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Charges & Totals</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Subtotal</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.subtotal?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Home Visit Fee</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.homeVisitFee?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Repair Charges</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.repairCharges?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Labor Charges</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.laborCharges?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Tax</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.taxAmount?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Discount</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.discountAmount?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total</p>
                  <p className="text-white font-bold text-lg">
                    {currency}
                    {selectedBill.totalAmount?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Paid</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.paidAmount?.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Balance</p>
                  <p className="text-white">
                    {currency}
                    {selectedBill.balanceAmount?.toLocaleString() || "-"}
                  </p>
                </div>
              </div>
              {selectedBill.notes && (
                <div className="mt-4">
                  <p className="text-gray-400">Notes</p>
                  <p className="text-white">{selectedBill.notes}</p>
                </div>
              )}
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
