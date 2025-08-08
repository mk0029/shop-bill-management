"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import { useBills } from "@/hooks/use-sanity-data";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  DollarSign,
  User,
} from "lucide-react";

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
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

export default function BillHistoryPage() {
  const router = useRouter();
  const { t, currency } = useLocaleStore();
  const { bills, isLoading } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Transform bills data to match the expected format
  const transformedBills = bills.map((bill) => ({
    id: bill._id,
    billNumber: bill.billNumber,
    customerName: bill.customer?.name || "Unknown Customer",
    customerPhone: bill.customer?.phone || "N/A",
    amount: bill.totalAmount || 0,
    date: bill.serviceDate
      ? new Date(bill.serviceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    dueDate: bill.serviceDate
      ? new Date(
          new Date(bill.serviceDate).getTime() + 15 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0]
      : new Date().toISOString().split("T")[0],
    status:
      bill.paymentStatus === "paid"
        ? "paid"
        : bill.paymentStatus === "pending"
        ? "pending"
        : "overdue",
    items:
      bill.items?.map((item) => ({
        name: item.productName || "Unknown Item",
        quantity: item.quantity || 0,
        price: item.unitPrice || 0,
        total: item.totalPrice || 0,
      })) || [],
    serviceType: bill.serviceType,
    locationType: bill.locationType,
    notes: bill.notes,
  }));

  const filteredBills = transformedBills.filter((bill) => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerPhone.includes(searchTerm) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = transformedBills
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + bill.amount, 0);
  const paidBills = transformedBills.filter(
    (bill) => bill.status === "paid"
  ).length;
  const pendingBills = transformedBills.filter(
    (bill) => bill.status === "pending"
  ).length;
  const overdueBills = transformedBills.filter(
    (bill) => bill.status === "overdue"
  ).length;

  const viewBillDetails = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Bill History
          </h1>
          <p className="text-gray-400 mt-1">View and manage all your bills</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 sm:gap-4 gap-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Total Revenue
                </p>
                <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                  {currency}
                  {totalRevenue.toLocaleString()}
                </p>
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
                  {transformedBills.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Paid Bills
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-green-400 mt-1">
                  {paidBills}
                </p>
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
                  Pending
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-yellow-400 mt-1">
                  {pendingBills + overdueBills}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-yellow-400" />
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
                placeholder="Search by customer name, phone, or bill ID..."
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
          <CardTitle className="text-white">All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBills.map((bill) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {bill.customerName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Bill #{bill.id} • {bill.customerPhone}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(bill.date).toLocaleDateString()} - Due:{" "}
                      {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {currency}
                      {bill.amount.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                        bill.status
                      )}`}>
                      {bill.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewBillDetails(bill)}>
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
            ))}
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
        title={`Bill #${selectedBill?.id} - ${selectedBill?.customerName}`}>
        {selectedBill && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">
                Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Name</p>
                  <p className="text-white">{selectedBill.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="text-white">{selectedBill.customerPhone}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Date</p>
                  <p className="text-white">
                    {new Date(selectedBill.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Due Date</p>
                  <p className="text-white">
                    {new Date(selectedBill.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Items */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Bill Items</h4>
              <div className="space-y-3">
                {selectedBill.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <div>
                      <p className="text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">
                        {item.quantity} × {currency}
                        {item.price}
                      </p>
                    </div>
                    <p className="font-semibold text-white">
                      {currency}
                      {item.total}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">
                  Total Amount
                </span>
                <span className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {currency}
                  {selectedBill.amount.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`text-sm px-3 py-1 rounded-full ${getStatusColor(
                    selectedBill.status
                  )}`}>
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
