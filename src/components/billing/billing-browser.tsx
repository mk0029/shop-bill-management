/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { BillForm } from "@/components/forms/bill-form";
import { useBills, useCustomers, useProducts } from "@/hooks/use-sanity-data";
import { BillFormData, Customer, Item } from "@/types";
import {
  RealtimeBillStats,
} from "@/components/realtime/realtime-bill-list";
import CustomerBillGroup from "@/components/billing/customer-bill-group";
import { FileText, Plus, Search, Calculator, FileTextIcon, Users } from "lucide-react";
import ResponsiveAccordion from "../ui/responsive-accordion";
import { safeUserName } from "@/lib/display-text";

export type BillingBrowserVariant = "all" | "pending";

interface BillingBrowserProps {
  title?: string;
  subtitle?: string;
  variant?: BillingBrowserVariant; // "pending" will pre-filter list to pending/partial/overdue
  rightAction?: ReactNode; // Optional custom action in header (e.g., Back button)
  defaultFilterStatus?: string; // e.g., "all" | "pending" | "paid" | "draft"
  defaultFilterStatuses?: string[]; // Multiple statuses
  isTechnician?: boolean;
}

export function BillingBrowser({
  title = "Billing Management",
  subtitle = "Create and manage customer bills",
  variant = "all",
  rightAction,
  defaultFilterStatus = variant === "pending" ? "pending" : "all",
  defaultFilterStatuses,
  isTechnician = false,
}: BillingBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const consumedOpenRef = useRef("");
  const { bills, updateBill } = useBills();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(defaultFilterStatus);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    defaultFilterStatuses && defaultFilterStatuses.length > 0
      ? defaultFilterStatuses
      : defaultFilterStatus && defaultFilterStatus !== "all"
        ? [defaultFilterStatus]
        : [],
  );

  // All initial data load and realtime setup is handled globally in `DataProvider`

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

  // Helper to construct the selected bill payload for the modal from a raw bill
  const buildSelectedBill = (bill: any) => {
    if (!bill) return null;
    return {
      id: bill._id,
      _id: bill._id,
      customerName: safeUserName(bill.customer?.name, "Unknown Customer"),
      customerId: bill.customer?._id || bill.customer?._ref || "",
      technician: bill.technician
        ? {
            _id: bill.technician?._id || bill.technician?._ref,
            name: safeUserName(bill.technician?.name, "Technician"),
            phone: bill.technician?.phone,
            email: bill.technician?.email,
          }
        : undefined,
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
            item.product?.productName || item.productName || "Unknown Item",
          productId: item.product?._id || item.product?._ref || "",
          productDetails: item.product || null,
        })) || [],
      serviceType: bill.serviceType || "sale",
      locationType: bill.locationType || "shop",
      homeVisitFee: bill.homeVisitFee || 0,
      transportationFee: bill.transportationFee || 0,
      repairCharges:
        (bill as any).repairCharges ?? (bill as any).repairFee ?? 0,
      subtotal: bill.subtotal || 0,
      total: bill.totalAmount || 0,
      status: bill.paymentStatus === "paid" ? "paid" : "pending",
      paymentStatus: bill.paymentStatus,
      paidAmount: bill.paidAmount,
      balanceAmount: bill.balanceAmount,
      notes: bill.notes,
      // Include discount for modal display
      discount: (bill as any)?.discount ?? (bill as any)?.discountAmount ?? 0,
      customer: {
        name: safeUserName(bill.customer?.name, "Unknown Customer"),
        phone: bill.customer?.phone || "",
        email: bill.customer?.email || "",
        location: bill.customer?.location || "",
        customerId: bill.customer?.customerId || bill.customerId || "",
        secretKey:
          customers.find(
            (c: any) => c._id === (bill.customer?._id || bill.customer?._ref),
          )?.secretKey ||
          bill.customer?.secretKey ||
          "",
      },
    };
  };

  const handleCreateBill = async (billData: BillFormData) => {
    // Placeholder: existing create flow opens dedicated page; keep modal for parity
    setShowCreateBill(false);
  };

  // Auto-open bill modal if URL contains ?open=<billId>
  useEffect(() => {
    const openId = searchParams?.get("open");
    if (!openId) return;
    const cleanOpenQuery = () => {
      const sp = new URLSearchParams(searchParams?.toString());
      if (!sp.has("open")) return;
      sp.delete("open");
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : `${pathname}`, {
        scroll: false,
      });
    };
    // If a bill is already selected for the same id, only clean the URL.
    if (
      selectedBill &&
      (selectedBill._id === openId || selectedBill.id === openId)
    ) {
      cleanOpenQuery();
      return;
    }
    const match = bills.find((b: any) => b._id === openId || b.id === openId || b.billId === openId);
    if (match) {
      if (consumedOpenRef.current !== openId) {
        consumedOpenRef.current = openId;
        setSelectedBill(buildSelectedBill(match));
      }
      cleanOpenQuery();
    }
  }, [bills, pathname, router, searchParams, selectedBill]);

  const handleViewBill = (bill: any) => {
    setSelectedBill(bill);
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
      discount?: number;
    },
  ) => {
    try {
      // Determine cumulative discount = existing + newly added
      const existingBill = bills.find(
        (b: any) => (b._id || b.id) === billId,
      ) as any;
      const existingDiscount = Number(
        (existingBill?.discount ?? existingBill?.discountAmount ?? 0) || 0,
      );
      const addDiscount =
        typeof paymentData.discount === "number"
          ? Math.max(Number(paymentData.discount || 0), 0)
          : 0;
      const totalDiscount = existingDiscount + addDiscount;
      if (process.env.NODE_ENV === "development") {
        console.time("updateBill->commit");
      }
      // Persist to Sanity via centralized data layer (only payment fields)
      await updateBill(billId, {
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        balanceAmount: paymentData.balanceAmount,
        ...(addDiscount > 0 ? { discount: totalDiscount } : {}),
      } as any);
      if (process.env.NODE_ENV === "development") {
        console.timeEnd("updateBill->commit");
        console.time("optimistic-selectedBill-set");
      }

      // Optimistically update currently open modal bill
      if (
        selectedBill &&
        (selectedBill.id === billId || (selectedBill as any)._id === billId)
      ) {
        setSelectedBill({
          ...selectedBill,
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          balanceAmount: paymentData.balanceAmount,
          ...(addDiscount > 0 ? { discount: totalDiscount } : {}),
        });
        if (process.env.NODE_ENV === "development") {
          console.timeEnd("optimistic-selectedBill-set");
        }
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      throw error;
    }
  };

  // Additional filter for pending variant
  const baseBills =
    variant === "pending"
      ? bills.filter((b: any) =>
          ["pending", "partial", "overdue"].includes(b.paymentStatus),
        )
      : bills;
  const initialForList =
    selectedStatuses.length > 0
      ? baseBills.filter((b: any) => {
          let statusValue = (
            (b.paymentStatus as string) ||
            (b.status as string) ||
            ""
          ).toLowerCase();

          // Calculate overdue status based on due date and payment status
          const isOverdue =
            b.dueDate &&
            new Date(b.dueDate) < new Date() &&
            statusValue !== "paid";

          if (isOverdue) {
            statusValue = "overdue";
          }

          return selectedStatuses.includes(statusValue);
        })
      : baseBills;

  // Compute per-group stats used for sorting
  const groupStats = useMemo(() => {
    const map = new Map<string, { totalPending: number; billCount: number; latestDate: number }>();
    initialForList.forEach((bill: any) => {
      const cid = bill.customer?._id || bill.customer?._ref;
      if (!cid) return;
      const prev = map.get(cid) || { totalPending: 0, billCount: 0, latestDate: 0 };
      const amount = Number(bill.totalAmount ?? 0);
      if ((bill.paymentStatus || bill.status) !== "paid") {
        prev.totalPending += bill.balanceAmount != null
          ? Number(bill.balanceAmount)
          : Math.max(0, amount - Number(bill.paidAmount ?? 0));
      }
      prev.billCount += 1;
      const d = new Date(bill.createdAt || bill.serviceDate || 0).getTime();
      if (d > prev.latestDate) prev.latestDate = d;
      map.set(cid, prev);
    });
    return map;
  }, [initialForList]);

  // Group bills by customer
  const groupedBills = useMemo(() => {
    const groups = new Map<string, { customer: any; bills: any[] }>();

    initialForList.forEach((bill: any) => {
      const customerId = bill.customer?._id || bill.customer?._ref;
      if (!customerId) return;
      if (!groups.has(customerId)) {
        groups.set(customerId, { customer: bill.customer, bills: [] });
      }
      groups.get(customerId)!.bills.push(bill);
    });

    const raw = Array.from(groups.entries())
      .map(([id, group]) => ({
        id,
        customer: group.customer,
        bills: group.bills.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.serviceDate || 0);
          const dateB = new Date(b.createdAt || b.serviceDate || 0);
          return dateB.getTime() - dateA.getTime();
        }),
      }));

    // Sort groups based on the selected sort mode
    const st = groupStats;
    switch (sortBy) {
      case "pending-high":
        return raw.sort((a, b) => (st.get(b.id)?.totalPending ?? 0) - (st.get(a.id)?.totalPending ?? 0));
      case "pending-low":
        return raw
          .filter((a) => (st.get(a.id)?.totalPending ?? 0) > 0)
          .sort((a, b) => (st.get(a.id)?.totalPending ?? 0) - (st.get(b.id)?.totalPending ?? 0));
      case "bills":
        return raw.sort((a, b) => (st.get(b.id)?.billCount ?? 0) - (st.get(a.id)?.billCount ?? 0));
      case "name":
        return raw.sort((a, b) => {
          const na = (a.customer?.name || "").toLowerCase();
          const nb = (b.customer?.name || "").toLowerCase();
          return na.localeCompare(nb);
        });
      case "latest":
      default:
        return raw.sort((a, b) => (st.get(b.id)?.latestDate ?? 0) - (st.get(a.id)?.latestDate ?? 0));
    }
  }, [initialForList, sortBy, groupStats]);

  // Overall search filters which customer groups are shown
  const visibleGroups = useMemo(() => {
    if (!searchTerm) return groupedBills;
    const lower = searchTerm.toLowerCase();
    return groupedBills.filter((g) => {
      const name = (g.customer?.name || "").toLowerCase();
      const phone = (g.customer?.phone || "").toLowerCase();
      if (name.includes(lower) || phone.includes(lower)) return true;
      return g.bills.some(
        (b: any) =>
          b.billNumber?.toLowerCase().includes(lower) ||
          b._id?.toLowerCase().includes(lower),
      );
    });
  }, [groupedBills, searchTerm]);

  const filterOptionsAll = [
    { value: "all", label: "All Bills" },
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "draft", label: "Draft" },
  ];

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            {title}
          </h1>
        </div>
        {rightAction ?? (
          <div className="flex items-center gap-2">
            {!isTechnician && (
              <Button
                onClick={() => {
                  router.push("/admin/billing/drafts");
                }}
                className="w-full sm:w-auto"
                variant="outline"
              >
                <FileTextIcon className="w-4 h-4 mr-2" />
                Drafts
              </Button>
            )}
            <Button
              onClick={() => {
                router.push("/admin/billing/create?fresh=1");
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Bill
            </Button>
          </div>
        )}
      </div>

      {/* Bill Statistics */}
      {!isTechnician && (
        <div>
          <ResponsiveAccordion
            className="mb-4"
            title={
              <h2 className="text-lg font-semibold text-white  flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                Bill Statistics
              </h2>
            }
          >
            <RealtimeBillStats
              key={`billing-stats-${variant}`}
              initialBills={bills}
            />
          </ResponsiveAccordion>
        </div>
      )}

      {/* Search and Sort */}
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

          {/* Sort controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Sort by</span>
            {[
              { value: "latest", label: "Latest" },
              { value: "pending-high", label: "Pending ↓" },
              { value: "pending-low", label: "Pending ↑" },
              { value: "bills", label: "Most Bills" },
              { value: "name", label: "Name" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`px-2.5 py-1 text-[11px] rounded-full border ${
                  sortBy === opt.value
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bills List - grouped by customer */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Bills
          </h2>
          <span className="text-xs text-gray-500 ml-1">
            {visibleGroups.length} cust · {initialForList.length} bill
          </span>
        </div>

        {visibleGroups.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No bills found</p>
              <p className="text-sm text-gray-500 mt-1">
                No bills match the current filters
              </p>
            </CardContent>
          </Card>
        ) : (
          visibleGroups.map((group) => (
            <CustomerBillGroup
              key={group.id}
              group={group}
              open={openGroupId === group.id}
              onToggle={() =>
                setOpenGroupId(
                  openGroupId === group.id ? null : group.id,
                )
              }
              onBillClick={(bill) => handleViewBill(buildSelectedBill(bill))}
            />
          ))
        )}
      </div>

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
        onClose={() => {
          setSelectedBill(null);
          // Remove `open` query param from URL without full navigation
          try {
            const sp = new URLSearchParams(searchParams?.toString());
            if (sp.has("open")) {
              sp.delete("open");
              const q = sp.toString();
              router.replace(q ? `${pathname}?${q}` : `${pathname}`, {
                scroll: false,
              });
            }
          } catch {}
        }}
        bill={selectedBill}
        onDownloadPDF={handleDownloadPDF}
        onUpdatePayment={handleUpdatePayment}
        showShareButton={true}
        showPaymentControls={true}
      />
    </div>
  );
}
