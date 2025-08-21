"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { BillForm } from "@/components/forms/bill-form";
import { useBills, useCustomers, useProducts } from "@/hooks/use-sanity-data";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useSanityRealtimeStore } from "@/store/sanity-realtime-store";
import { BillFormData, Customer, Item } from "@/types";
import { RealtimeBillList, RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { FileText, Plus, Search, Calculator } from "lucide-react";

export type BillingBrowserVariant = "all" | "pending";

interface BillingBrowserProps {
  title?: string;
  subtitle?: string;
  variant?: BillingBrowserVariant; // "pending" will pre-filter list to pending/partial/overdue
  rightAction?: ReactNode; // Optional custom action in header (e.g., Back button)
  defaultFilterStatus?: string; // e.g., "all" | "pending" | "paid" | "draft"
  defaultFilterStatuses?: string[]; // Multiple statuses
}

export function BillingBrowser({
  title = "Billing Management",
  subtitle = "Create and manage customer bills",
  variant = "all",
  rightAction,
  defaultFilterStatus = variant === "pending" ? "pending" : "all",
  defaultFilterStatuses,
}: BillingBrowserProps) {
  const router = useRouter();
  const { bills } = useBills();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(defaultFilterStatus);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    defaultFilterStatuses && defaultFilterStatuses.length > 0
      ? defaultFilterStatuses
      : defaultFilterStatus && defaultFilterStatus !== "all"
        ? [defaultFilterStatus]
        : []
  );

  // Ensure the real-time bill store has initial data so stats render immediately
  const { fetchBills } = useSanityBillStore();
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Real-time updates are managed centrally via RealtimeProvider/useRealtimeSync
  // Ensure the Sanity realtime bus is connected and bill store listeners are registered
  useEffect(() => {
    // Connect global realtime and init bill listeners
    try {
      useSanityRealtimeStore.getState().connect();
    } catch {}
    try {
      useSanityBillStore.getState().initializeRealtime();
    } catch {}

    return () => {
      // Cleanup listeners; keep global connection if other pages rely on it
      try {
        useSanityBillStore.getState().cleanupRealtime();
      } catch {}
      // Do not force global disconnect here to avoid tearing down for other consumers
    };
  }, []);

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
    // Placeholder: existing create flow opens dedicated page; keep modal for parity
    setShowCreateBill(false);
  };

  const handleViewBill = (bill: any) => {
    console.log("Viewing bill:", bill);
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
      // Persist to Sanity via store (only payment fields)
      const ok = await useSanityBillStore.getState().updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
      });

      if (!ok) {
        throw new Error("Failed to update bill in store");
      }

      // Optimistically update currently open modal bill
      if (selectedBill && (selectedBill.id === billId || (selectedBill as any)._id === billId)) {
        setSelectedBill({
          ...selectedBill,
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          balanceAmount: paymentData.balanceAmount,
        });
      }

      // Ensure list reflects latest data even if realtime misses an event
      try {
        await fetchBills();
      } catch {}
    } catch (error) {
      console.error("Error updating payment:", error);
      throw error;
    }
  };

  // Additional filter for pending variant
  const computedFilterStatus = "all"; // We will handle status filtering locally when multi-select is used
  const baseBills = variant === "pending"
    ? bills.filter((b: any) => ["pending", "partial", "overdue"].includes(b.paymentStatus))
    : bills;
  const initialForList = selectedStatuses.length > 0
    ? baseBills.filter((b: any) =>
        selectedStatuses.includes(b.paymentStatus) || selectedStatuses.includes(b.status)
      )
    : baseBills;
  const filterOptionsAll = [
    { value: "all", label: "All Bills" },
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "draft", label: "Draft" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            {title}
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            {subtitle}
          </p>
        </div>
        {rightAction ?? (
          <Button
            onClick={() => {
              try {
                localStorage.setItem("bill_create_skip_restore", "1");
              } catch {}
              router.push("/admin/billing/create?fresh=1");
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Bill
          </Button>
        )}
      </div>

      {/* Bill Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          Bill Statistics
        </h2>
        <RealtimeBillStats key={`billing-stats-${variant}`} initialBills={bills} />
      </div>

      {/* Search and Filter */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="Search bills by customer name or bill ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "partial", "overdue", "paid", "draft"] as readonly string[]).map(
              (status) => {
                const active = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatuses((prev) => {
                        const set = new Set(prev);
                        if (set.has(status)) set.delete(status);
                        else set.add(status);
                        return Array.from(set);
                      });
                    }}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      active
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-gray-800 text-gray-300 border-gray-700"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                );
              }
            )}
            <button
              type="button"
              onClick={() => setSelectedStatuses([])}
              className={`px-3 py-1 text-xs rounded-full border ${selectedStatuses.length === 0 ? "bg-blue-600 text-white border-blue-500" : "bg-gray-800 text-gray-300 border-gray-700"}`}
            >
              All
            </button>
          </div>
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
              initialBills={initialForList}
              searchTerm={searchTerm}
              filterStatus={computedFilterStatus}
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
                      product: item.product || null,
                      brand: item.brand || "",
                      category: item.category || "",
                      specifications: item.specifications || "",
                      unit: item.unit || "piece",
                      productName:
                        item.product?.productName ||
                        item.productName ||
                        "Unknown Item",
                      productId: item.product?._id || item.product?._ref || "",
                      productDetails: item.product || null,
                    })) || [],
                  serviceType: bill.serviceType || "sale",
                  locationType: bill.locationType || "shop",
                  homeVisitFee: bill.homeVisitFee || 0,
                  transportationFee: bill.transportationFee || 0,
                  repairCharges: (bill as any).repairCharges ?? (bill as any).repairFee ?? 0,
                  laborCharges: bill.laborCharges || 0,
                  subtotal: bill.subtotal || 0,
                  total: bill.totalAmount || 0,
                  status: bill.paymentStatus === "paid" ? "paid" : "pending",
                  paymentStatus: bill.paymentStatus,
                  paidAmount: bill.paidAmount,
                  balanceAmount: bill.balanceAmount,
                  notes: bill.notes,
                  customer: {
                    name: bill.customer?.name || "Unknown Customer",
                    phone: bill.customer?.phone || "",
                    email: bill.customer?.email || "",
                    location: bill.customer?.location || "",
                    customerId: bill.customer?.customerId || bill.customerId || "",
                    secretKey:
                      customers.find(
                        (c: any) =>
                          c._id === (bill.customer?._id || bill.customer?._ref)
                      )?.secretKey || bill.customer?.secretKey || "",
                  },
                })
              }
              showNewBillAnimation={true}
            />
          </div>
        </div>
      </Card>

      {/* Bill Form (kept for parity, not shown by default) */}
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
        onUpdatePayment={handleUpdatePayment}
        showShareButton={true}
        showPaymentControls={true}
      />
    </div>
  );
}
