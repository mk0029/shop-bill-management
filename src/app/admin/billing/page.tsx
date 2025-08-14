/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { Dropdown } from "@/components/ui/dropdown";
import { BillForm } from "@/components/forms/bill-form";
import { useLocaleStore } from "@/store/locale-store";
import { useRouter } from "next/navigation";
import { useBills, useCustomers, useProducts } from "@/hooks/use-sanity-data";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useSeamlessRealtime } from "@/hooks/use-seamless-realtime";
import { BillFormData, Customer, Item } from "@/types";
import {
  RealtimeBillList,
  RealtimeBillStats,
} from "@/components/realtime/realtime-bill-list";
import { FileText, Plus, Search, Calculator } from "lucide-react";
import { useWhatsAppMessaging } from "@/hooks/use-whatsapp-config";
import { BillDetails } from "@/lib/whatsapp-utils";

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Bill {
  id: string;
  _id?: string;
  customerName: string;
  customerId: string;
  date: string;
  dueDate?: string;
  items: BillItem[];
  serviceType: string;
  locationType: string;
  homeVisitFee: number;
  subtotal: number;
  total: number;
  status: string;
  paymentStatus?: "pending" | "partial" | "paid";
  paidAmount?: number;
  balanceAmount?: number;
  taxAmount?: number;
  notes?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { bills } = useBills();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const { sendBillMessage, isConfigured } = useWhatsAppMessaging();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Ensure the real-time bill store has initial data so stats render immediately
  const { fetchBills } = useSanityBillStore();
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Enable seamless real-time updates in the background
  useSeamlessRealtime();

  // Transform bills data to match the expected format
  const transformedBills: Bill[] = bills.map((bill) => ({
    id: bill._id,
    customerName: bill.customer?.name || "Unknown Customer",
    customerId: bill.customer?._id || "",
    date: bill.serviceDate
      ? new Date(bill.serviceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    items:
      bill.items?.map((item) => ({
        name: item.productName || "Unknown Item",
        quantity: item.quantity || 0,
        price: item.unitPrice || 0,
        total: item.totalPrice || 0,
      })) || [],
    serviceType: bill.serviceType || "sale",
    locationType: bill.locationType || "shop",
    homeVisitFee: bill.homeVisitFee || 0,
    subtotal: bill.subtotal || 0,
    total: bill.totalAmount || 0,
    status: bill.paymentStatus === "paid" ? "paid" : "pending",
    notes: bill.notes,
  }));

  // Transform customers data (users with customer role)
  const transformedCustomers: Customer[] = customers.map((customer) => ({
    _id: customer._id,
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone || "",
    location: customer.location || "",
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: (customer as any).updatedAt || customer.createdAt,
  }));

  // Transform products data - use type assertion to handle structure differences
  const transformedItems: Item[] = products as any;

  const handleCreateBill = async (billData: BillFormData) => {
    console.log("Creating bill:", billData);
    // TODO: Implement bill creation
    setShowCreateBill(false);
  };

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleDownloadPDF = (bill: any) => {
    // TODO: Implement PDF download
    console.log("Download PDF for bill:", bill.id || bill._id);
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
      // TODO: Implement payment update API call with actual bill store
      console.log("Updating payment for bill:", billId, paymentData);

      // Show success notification
      if (paymentData.paymentStatus === "paid") {
        console.log("✅ Bill marked as fully paid!");
      } else {
        console.log(
          `✅ Payment of ₹${paymentData.paidAmount.toFixed(2)} recorded successfully!`
        );
      }

      // Force immediate UI update by updating the selected bill
      if (
        selectedBill &&
        (selectedBill.id === billId || selectedBill._id === billId)
      ) {
        setSelectedBill({
          ...selectedBill,
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          balanceAmount: paymentData.balanceAmount,
        } as Bill);
      }

      // The real-time listener will automatically update the bills list and stats
    } catch (error) {
      console.error("❌ Error updating payment:", error);
      throw error;
    }
  };

  const handleShareOnWhatsApp = async (bill: Bill) => {
    if (!isConfigured) {
      alert(
        "WhatsApp Business is not configured. Please configure it in settings."
      );
      return;
    }

    try {
      // Find customer phone number
      const customer = transformedCustomers.find(
        (c) => c._id === bill.customerId
      );

      if (!customer?.phone) {
        alert(
          "Customer phone number not found. Please update customer details."
        );
        return;
      }

      // Convert Bill to BillDetails format
      const billDetails: BillDetails = {
        billNumber: bill.id,
        customerName: bill.customerName,
        customerPhone: customer.phone,
        billDate: bill.date,
        dueDate:
          bill.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        items: bill.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: bill.subtotal || bill.total,
        tax: bill.taxAmount,
        total: bill.total,
        notes: bill.notes || "Thank you for your business!",
        userId: `customer_${bill.customerId}`,
        passKey: `bill_${bill.id}`,
      };

      const result = await sendBillMessage(billDetails);

      if (result.status === "sent") {
        alert(`WhatsApp message sent successfully via ${result.deviceUsed}!`);
      } else {
        alert(
          `Failed to send message: ${result.error || "Unknown error"}. Please check your configuration.`
        );
      }
    } catch (error) {
      console.error("WhatsApp send error:", error);
      alert("Failed to send WhatsApp message. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            Billing Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Create and manage customer bills
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing/create")}
          className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Bill Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          Bill Statistics
        </h2>
        <RealtimeBillStats key="billing-stats" initialBills={bills} />
      </div>

      {/* Search and Filter */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search bills by customer name or bill ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <Dropdown
            options={[
              { value: "all", label: "All Bills" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
            ]}
            value={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="Filter by status"
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Bills
          </h2>
          <div className="max-h-[600px] overflow-y-auto">
            <RealtimeBillList
              initialBills={bills}
              searchTerm={searchTerm}
              filterStatus={filterStatus}
              onBillClick={(bill) =>
                handleViewBill({
                  id: bill._id,
                  _id: bill._id,
                  customerName: bill.customer?.name || "Unknown Customer",
                  customerId: bill.customer?._id || bill.customer?._ref || "",
                  date: bill.serviceDate
                    ? new Date(bill.serviceDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                  items:
                    bill.items?.map((item: any) => ({
                      name: item.productName || "Unknown Item",
                      quantity: item.quantity || 0,
                      price: item.unitPrice || 0,
                      total: item.totalPrice || 0,
                    })) || [],
                  serviceType: bill.serviceType || "sale",
                  locationType: bill.locationType || "shop",
                  homeVisitFee: bill.homeVisitFee || 0,
                  subtotal: bill.subtotal || 0,
                  total: bill.totalAmount || 0,
                  status: bill.paymentStatus === "paid" ? "paid" : "pending",
                  paymentStatus: bill.paymentStatus,
                  paidAmount: bill.paidAmount,
                  balanceAmount: bill.balanceAmount,
                  notes: bill.notes,
                })
              }
              showNewBillAnimation={true}
            />
          </div>
        </div>
      </Card>

      {/* Bill Form */}
      <BillForm
        isOpen={showCreateBill}
        onClose={() => setShowCreateBill(false)}
        onSubmit={handleCreateBill}
        customers={transformedCustomers}
        items={transformedItems}
      />

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        bill={selectedBill}
        onDownloadPDF={handleDownloadPDF}
        onShare={handleShareOnWhatsApp}
        onUpdatePayment={handleUpdatePayment}
        showShareButton={true}
        showPaymentControls={true}
      />
    </div>
  );
}
