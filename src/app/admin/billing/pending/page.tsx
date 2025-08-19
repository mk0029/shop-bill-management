"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
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
import { useSanityBillStore } from "@/store/sanity-bill-store";



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
  createdAt: string;
  taxAmount?: number;
  customerId?: string;
}

export default function PendingBillsPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const { bills, isLoading } = useBills();
  const { updateBill } = useSanityBillStore();
  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  // Using BillDetailTrigger for modal; no local modal state needed

  // Map of raw bills for retrieving full data in the modal
  const rawBillById = Object.fromEntries(
    bills.map((b: any) => [b._id || b.id, b])
  );

  // Transform and filter bills to show only pending/overdue ones
  const pendingBills: Bill[] = bills
    .filter(
      (bill) =>
        bill.paymentStatus === "pending" ||
        bill.paymentStatus === "overdue" ||
        bill.paymentStatus === "partial"
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
      status:
        bill.paymentStatus === "pending"
          ? "pending"
          : bill.paymentStatus === "partial"
            ? "partial"
            : "overdue",
      items:
        bill.items?.map((item) => ({
          name: item.productName || "Unknown Item",
          quantity: item.quantity || 0,
          price: item.unitPrice || 0,
          total: item.totalPrice || 0,
        })) || [],
      subtotal: bill.subtotal || bill.totalAmount || 0,
      notes: bill.notes,
      createdAt: bill.createdAt || new Date().toISOString(),
      taxAmount: bill.taxAmount,
      customerId: bill.customer?._id,
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

  // View handled by BillDetailTrigger

  const handleDownloadPDF = (bill: any) => {
    // TODO: Implement PDF download
    console.log("Download PDF for bill:", bill.billNumber || bill._id);
  };

  const handleUpdatePayment = async (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
    }
  ) => {
    try {
      const success = await updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
      });

      if (success) {
        console.log("✅ Payment updated successfully");
      } else {
        throw new Error("Failed to update payment");
      }
    } catch (error) {
      console.error("❌ Error updating payment:", error);
      throw error;
    }
  };

  const handleShareOnWhatsApp = (bill: Bill) => {
    const items = bill.items
      .map(
        (item) =>
          `• ${item.name}: ${item.quantity} x ₹${item.price.toFixed(2)} = ₹${item.total.toFixed(2)}`
      )
      .join("\n");

    const message =
      `*Bill #${bill.billNumber}*\n\n` +
      `*Items:*\n${items}\n\n` +
      `*Total Amount: ₹${bill.total.toFixed(2)}*\n\n` +
      (bill.notes ? `*Notes:*\n${bill.notes}\n\n` : "") +
      `Thank you for your business!`;

    if (!bill.customerPhone || bill.customerPhone === "N/A") {
      alert("Customer phone number is required for sharing on WhatsApp");
      return;
    }

    const phone = bill.customerPhone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "partial":
        return "bg-orange-500";
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
      case "partial":
        return "Partial";
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
    <div className="space-y-6 max-md:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Pending Bills
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Manage and track all pending payments
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing")}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto">
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
      <div className="flex max-h-dvh flex-col gap-y-3 md:gap-y-4 pt-8 !-mt-3 md:!-mt-4">
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
              { value: "partial", label: "Partial" },
              { value: "overdue", label: "Overdue" },
            ]}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Filter by status"
            className="bg-gray-800 border-gray-700 w-full sm:w-auto"
          />
        </div>

        {/* Bills List */}
        <div className="space-y-3 md:space-y-4 flex flex-col grow overflow-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading pending bills...</p>
            </div>
          ) : (
            filteredBills.map((bill) => (
              <Card
                key={bill.id}
                className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Header: bill no + status */}
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white truncate">{bill.billNumber}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(bill.status)} text-white`}>
                        {getStatusText(bill.status)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Customer</p>
                        <p className="text-white font-medium truncate">{bill.customerName}</p>
                        <p className="text-gray-400 text-xs truncate">{bill.customerPhone}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Dates</p>
                        <p className="text-white text-xs">Bill: {bill.billDate}</p>
                        <p className="text-white text-xs">Due: {bill.dueDate}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs">Amount</p>
                        <p className="text-white font-semibold truncate">{currency}{bill.total.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs">{bill.items.length} items</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <BillDetailTrigger
                        bill={rawBillById[bill.id] || bill}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onDownloadPDF={handleDownloadPDF}
                        onUpdatePayment={async (billId, data) => { await handleUpdatePayment(billId, data); }}
                        showShareButton={true}
                        showPaymentControls={true}
                      >
                        <span className="inline-flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </span>
                      </BillDetailTrigger>
                    
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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

      {/* Modal handled via BillDetailTrigger per row */}
    </div>
  );
}
