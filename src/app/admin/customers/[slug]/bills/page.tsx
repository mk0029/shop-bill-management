"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import {
  ArrowLeft,
  User,
  FileText,
  Search,
  Plus,
  Eye,
  Download,
} from "lucide-react";
import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import { useLocaleStore } from "@/store/locale-store";
import { RealtimeBillList } from "@/components/realtime/realtime-bill-list";
import { toast } from "sonner";

export default function CustomerBillsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.slug as string;
  const { currency } = useLocaleStore();

  const { customers, isLoading: customersLoading } = useCustomers();
  const { bills, isLoading: billsLoading, updateBill } = useBills();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Find the customer
  const customer = customers.find((c) => c._id === customerId);

  // Filter bills for this customer
  const getCustomerId = (c: unknown): string | undefined => {
    const anyC: any = c as any;
    if (!anyC) return undefined;
    if (typeof anyC === "string") return anyC;
    return anyC._id || anyC._ref || undefined;
  };

  const customerBills = bills.filter((bill: any) => getCustomerId(bill.customer) === customerId);

  // Calculate customer stats
  const stats = {
    totalBills: customerBills.length,
    totalAmount: customerBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    ),
    paidAmount: customerBills.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0),
    pendingAmount: customerBills
      .filter((bill) => bill.paymentStatus !== "paid")
      .reduce(
        (sum, bill) => sum + (bill.balanceAmount || bill.totalAmount || 0),
        0
      ),
    paidBills: customerBills.filter((bill) => bill.paymentStatus === "paid")
      .length,
    pendingBills: customerBills.filter((bill) => bill.paymentStatus !== "paid")
      .length,
  };

  const handleViewBill = (bill: unknown) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleCreateBill = () => {
    try { localStorage.setItem("bill_create_skip_restore", "1"); } catch {}
    router.push(`/admin/billing/create?customerId=${customerId}&fresh=1`);
  };

  const handleDownloadPDF = (bill: any) => {
    // TODO: Implement PDF download
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
      await updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
        updatedAt: new Date().toISOString(),
      });

      // Show success notification
      if (paymentData.paymentStatus === "paid") {
        toast.success("✅ Bill marked as fully paid!");
      } else {
        toast.success(
          `✅ Payment of ₹${paymentData.paidAmount.toFixed(2)} recorded successfully!`
        );
      }

      // Force immediate UI update by updating the selected bill
      if (selectedBill && selectedBill._id === billId) {
        setSelectedBill({
          ...selectedBill,
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          balanceAmount: paymentData.balanceAmount,
        });
      }

      // The real-time listener will automatically update the bills list and stats
    } catch (error) {
      toast.error("❌ Failed to update payment. Please try again.");
      throw error;
    }
  };

  if (customersLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Customer Not Found
          </h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            {customer.name}&apos;s Bills
          </h1>
          <p className="text-gray-400 mt-1">
            {customer.phone} • {customer.location}
          </p>
        </div>
        <Button
          onClick={handleCreateBill}
          className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Bills</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalBills}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  {currency}
                  {stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Paid Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  {currency}
                  {stats.paidAmount.toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-orange-400">
                  {currency}
                  {stats.pendingAmount.toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="Search bills by bill number or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bills ({customerBills.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RealtimeBillList
            initialBills={customerBills}
            customerId={customerId}
            searchTerm={searchTerm}
            onBillClick={handleViewBill}
            showNewBillAnimation={true}
          />
        </CardContent>
      </Card>

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        bill={selectedBill}
        onDownloadPDF={handleDownloadPDF}
        onUpdatePayment={handleUpdatePayment}
        showShareButton={true}
        showPaymentControls={true}
      />
    </div>
  );
}
