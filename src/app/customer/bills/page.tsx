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

export default function CustomerBillsPage() {
  const { t, currency } = useLocaleStore();
  const { user } = useAuthStore();
  const { getBillsByCustomer } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Get real bills for the current customer
  const bills = user ? getBillsByCustomer(user.id) : [];

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.locationType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      bill.paymentStatus === statusFilter ||
      bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSpent = bills
    .filter((bill) => bill.paymentStatus === "paid")
    .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  const totalBills = bills.length;
  const paidBills = bills.filter(
    (bill) => bill.paymentStatus === "paid"
  ).length;
  const pendingBills = bills.filter(
    (bill) => bill.paymentStatus === "pending"
  ).length;
  const overdueBills = bills.filter(
    (bill) => bill.paymentStatus === "overdue"
  ).length;

  const viewBillDetails = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">My Bills</h1>
        <p className="text-gray-400 mt-1">
          View and manage all your bills and payments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {currency}
                  {totalSpent.toLocaleString()}
                </p>
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
                <p className="text-2xl font-bold text-white mt-1">
                  {totalBills}
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
                <p className="text-gray-400 text-sm font-medium">Paid Bills</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {paidBills}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {pendingBills + overdueBills}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
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
        title={`Bill #${selectedBill?.billNumber}`}
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
                  <p className="text-gray-400">Bill Number</p>
                  <p className="text-white">{selectedBill.billNumber}</p>
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
                {selectedBill.items && selectedBill.items.length > 0 ? (
                  selectedBill.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0"
                    >
                      <div>
                        <p className="text-white">
                          {item.productName || "Product"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {item.quantity} × {currency}
                          {item.unitPrice}
                        </p>
                        {item.specifications && (
                          <p className="text-xs text-gray-500">
                            {item.specifications}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-white">
                        ll{currency}
                        {item.totalPrice?.toLocaleString() || 0}
                      </p>
                    </div>
                  ))
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
