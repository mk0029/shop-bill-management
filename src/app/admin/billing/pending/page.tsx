"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Phone,
  Share2,
  Eye,
  ArrowLeft,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import { useBills } from "@/hooks/use-sanity-data";

interface Bill {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  billDate: string;
  dueDate: string;
  total: number;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  notes?: string;
}

// Mock pending bills data
// WhatsApp sharing utility function
const shareBillOnWhatsApp = (bill: Bill) => {
  const message = `Bill Details:\n\nBill Number: ${
    bill.billNumber
  }\nCustomer: ${bill.customerName}\nPhone: ${bill.customerPhone}\nAmount: ₹${
    bill.total
  }\nDue Date: ${bill.dueDate}\n\nItems:\n${bill.items
    .map(
      (item) =>
        `- ${item.name}: ${item.quantity} x ₹${item.price} = ₹${item.total}`
    )
    .join("\n")}\n\nTotal: ₹${bill.total}`;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${bill.customerPhone.replace(
    /[^0-9]/g,
    ""
  )}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
};

export default function PendingBillsPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const { bills, isLoading } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Transform and filter bills to show only pending/overdue ones
  const pendingBills: Bill[] = bills
    .filter(
      (bill) =>
        bill.paymentStatus === "pending" || bill.paymentStatus === "overdue"
    )
    .map((bill) => ({
      id: bill._id,
      billNumber: bill.billNumber,
      customerName: bill.customer?.name || "Unknown Customer",
      customerPhone: bill.customer?.phone || "N/A",
      billDate: bill.serviceDate
        ? new Date(bill.serviceDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: bill.serviceDate
        ? new Date(
            new Date(bill.serviceDate).getTime() + 15 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0]
        : new Date().toISOString().split("T")[0],
      total: bill.totalAmount || 0,
      status: bill.paymentStatus === "pending" ? "pending" : "overdue",
      items:
        bill.items?.map((item) => ({
          name: item.productName || "Unknown Item",
          quantity: item.quantity || 0,
          price: item.unitPrice || 0,
          total: item.totalPrice || 0,
        })) || [],
      subtotal: bill.subtotal || bill.totalAmount || 0,
      notes: bill.notes,
    }));

  // Filter bills based on search and status
  const filteredBills = pendingBills.filter((bill) => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerPhone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleShareOnWhatsApp = (bill: Bill) => {
    shareBillOnWhatsApp(bill);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      case "paid":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "overdue":
        return "Overdue";
      case "paid":
        return "Paid";
      default:
        return "Unknown";
    }
  };

  const totalPendingAmount = pendingBills.reduce(
    (sum, bill) => sum + bill.total,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Pending Bills
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage and track all pending payments
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing")}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">
                  Total Pending
                </p>
                <p className="text-xl sm:text-2xl font-bold text-white truncate">
                  {currency}
                  {totalPendingAmount.toLocaleString()}
                </p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">
                  Pending Bills
                </p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {pendingBills.length}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">
                  Overdue Bills
                </p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {
                    pendingBills.filter((bill) => bill.status === "overdue")
                      .length
                  }
                </p>
              </div>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by customer name, bill number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <Dropdown
          options={[
            { value: "all", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "overdue", label: "Overdue" },
          ]}
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Filter by status"
          className="bg-gray-800 border-gray-700 w-full sm:w-auto"
        />
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading pending bills...</p>
          </div>
        ) : (
          filteredBills.map((bill) => (
            <Card
              key={bill.id}
              className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">
                        {bill.billNumber}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          bill.status
                        )} text-white`}
                      >
                        {getStatusText(bill.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Customer</p>
                        <p className="text-white font-medium truncate">
                          {bill.customerName}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {bill.customerPhone}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Dates</p>
                        <p className="text-white text-xs">
                          Bill: {bill.billDate}
                        </p>
                        <p className="text-white text-xs">
                          Due: {bill.dueDate}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Amount</p>
                        <p className="text-white font-semibold truncate">
                          {currency}
                          {bill.total.toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {bill.items.length} items
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBill(bill)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleShareOnWhatsApp(bill)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs"
                    >
                      <Share2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!isLoading && filteredBills.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No Pending Bills
            </h3>
            <p className="text-gray-400">
              No bills match your current filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill Details - ${selectedBill?.billNumber}`}
      >
        {selectedBill && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">
                Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                  <p className="text-white">{selectedBill.billDate}</p>
                </div>
                <div>
                  <p className="text-gray-400">Due Date</p>
                  <p className="text-white">{selectedBill.dueDate}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-medium text-white mb-3">Items</h4>
              <div className="space-y-2">
                {selectedBill.items.map((item, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-gray-400 text-sm">
                        Qty: {item.quantity} × {currency}
                        {item.price}
                      </p>
                    </div>
                    <p className="text-white font-semibold">
                      {currency}
                      {item.total}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">
                    {currency}
                    {selectedBill.subtotal}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    {currency}
                    {selectedBill.total}
                  </span>
                </div>
              </div>
            </div>

            {selectedBill.notes && (
              <div>
                <h4 className="font-medium text-white mb-2">Notes</h4>
                <p className="text-gray-400 bg-gray-800 p-3 rounded-lg">
                  {selectedBill.notes}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => handleShareOnWhatsApp(selectedBill)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
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
