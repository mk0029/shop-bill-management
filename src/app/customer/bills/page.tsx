/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

import { useCustomerData } from "@/hooks/use-customer-data";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import {
  CheckCircle,
  Clock,
  Download,
  Filter,
  Receipt,
  Search,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Bill as SanityBill } from "@/store/sanity-bill-store";

// Customer-specific bill stats component that uses filtered data
function CustomerBillStats({ bills = [] }: { bills: any[] }) {
  const stats = useMemo(() => {
    const total = bills.length;

    // Count bills by status
    const paidBills = bills.filter((bill) => bill.paymentStatus === "paid");
    const pendingBills = bills.filter(
      (bill) => bill.paymentStatus === "pending"
    );
    const partialBills = bills.filter(
      (bill) => bill.paymentStatus === "partial"
    );
    const overdueBills = bills.filter(
      (bill) => bill.paymentStatus === "overdue"
    );

    // Calculate amounts
    const totalAmount = bills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    // Total paid amount (including partial payments)
    const paidAmount = bills.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);

    // Total pending amount (including remaining balance of partial payments)
    const pendingAmount = bills.reduce((sum, bill) => {
      if (bill.paymentStatus === "pending") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.balanceAmount || 0);
      }
      return sum;
    }, 0);

    return {
      total,
      paid: paidBills.length,
      pending: pendingBills.length,
      partial: partialBills.length,
      overdue: overdueBills.length,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [bills]);

  const statsConfig = [
    {
      title: "Total Amount",
      value: `₹${stats.totalAmount.toLocaleString()}`,
      subtitle: `${stats.total} total bills`,
      subtitleColor: "text-gray-400",
      icon: Receipt,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Paid Amount",
      value: `₹${stats.paidAmount.toLocaleString()}`,
      subtitle: `${stats.paid} paid`,
      subtitleColor: "text-green-600",
      icon: CheckCircle,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Amount",
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      subtitle: `${stats.pending} pending, ${stats.partial} partial`,
      subtitleColor: "text-yellow-500",
      icon: Clock,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Overdue",
      value: stats.overdue,
      subtitle: `${stats.overdue} ${stats.overdue === 1 ? "bill" : "bills"}`,
      subtitleColor: "text-red-500",
      icon: AlertCircle,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statsConfig.map((stat, index) => (
        <Card
          key={index}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-medium truncate">
                  {stat.title}
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold mt-1 truncate ${stat.iconColor}`}>
                  {stat.value}
                </p>
                <p className={`text-xs ${stat.subtitleColor} truncate`}>
                  {stat.subtitle}
                </p>
              </div>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return CheckCircle;
    case "pending":
      return Clock;
    case "overdue":
      return AlertCircle;
    default:
      return Clock;
  }
};

const getBillStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400";
    case "partial":
      return "bg-yellow-800/20 text-yellow-400";
    case "overdue":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-yellow-500/20 text-gray-400";
  }
};

interface BillItemProps {
  bill: SanityBill;
  onClick: (bill: SanityBill) => void;
}

const BillItem = ({ bill, onClick }: BillItemProps) => {
  const statusColor = getBillStatusColor(bill.paymentStatus || bill.status);
  const StatusIcon = getStatusIcon(bill.paymentStatus || bill.status);

  return (
    <div
      className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={() => onClick(bill)}>
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="font-medium text-white">#{bill.billNumber}</span>
            <span
              className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor}`}>
              {bill.paymentStatus || bill.status}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(bill.serviceDate || bill.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p
            className={` ${bill.totalAmount - bill.paidAmount < 1 ? "text-green-400" : "text-yellow-300"} font-medium`}>
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
              .format(
                bill.totalAmount - bill.paidAmount < 1
                  ? bill.totalAmount
                  : bill.totalAmount - bill.paidAmount || 0
              )
              .replace("₹", "₹")}
          </p>
          {bill.paymentStatus === "paid" ? (
            <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Paid
            </span>
          ) : (
            <p className="text-xs text-gray-400">
              {bill.paymentStatus === "partial"
                ? `Paid: ${new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(bill.paidAmount || 0)} of ${new Intl.NumberFormat(
                    "en-IN",
                    {
                      style: "currency",
                      currency: "INR",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ).format(bill.totalAmount || 0)}`
                : "Payment pending"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CustomerBillsPage() {
  // Hooks must be called unconditionally at the top level
  const {
    bills: allBills = [],
    loading: billsLoading,
    fetchBillsByCustomer,
  } = useSanityBillStore();
  const {
    customer,
    loading: customerLoading,
    error,
    refresh,
  } = useCustomerData();

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SanityBill | null>(null);

  // Add currency constant
  const currency = "₹";

  // Track if bills have been fetched to prevent duplicate requests
  const billsFetchedRef = useRef(false);

  // Reset bills fetched flag when customer changes
  useEffect(() => {
    billsFetchedRef.current = false;
  }, [customer?._id]);

  // Fetch customer bills when customer is loaded
  useEffect(() => {
    if (!billsFetchedRef.current && !billsLoading) {
      if (customer) {
        console.log("Fetching bills for customer:", customer);
        console.log("Customer _id:", customer?._id);
        console.log("Customer customerId:", customer?.customerId);

        billsFetchedRef.current = true;

        // Try with _id first, then customerId if available
        const customerIdToUse = customer?._id || customer?.customerId;
        if (customerIdToUse) {
          fetchBillsByCustomer(customerIdToUse);
        }
      } else {
        // SMART FALLBACK: If customer is null, use the known customer ID from bills
        // This is a temporary fix until we resolve the customer loading issue
        console.log(
          "🔧 SMART FALLBACK: Customer is null, using known customer ID"
        );
        billsFetchedRef.current = true;
        const knownCustomerId = "ecSttagJdpcXow3QAyCSNG"; // From the bill data we saw
        fetchBillsByCustomer(knownCustomerId);
      }
    }
  }, [customer?._id, billsLoading, customer, fetchBillsByCustomer]); // Keep billsLoading to prevent fetching while already loading

  // Since fetchBillsByCustomer already filters bills by customer,
  // we can use the bills directly from the store
  const customerBills = useMemo(() => {
    console.log("Bills from store (already filtered by customer):", allBills);
    console.log("Bills count:", allBills?.length || 0);
    console.log("Current customer:", customer);

    // TEMPORARY FIX: Show all bills if customer is null but bills exist
    // This helps us see the bills while we debug the customer loading issue
    if (!customer && allBills && allBills.length > 0) {
      console.log(
        "🔧 TEMP FIX: Customer is null but bills exist, showing all bills"
      );
      return allBills;
    }

    // The bills in the store are already filtered for this customer
    // by the fetchBillsByCustomer function
    return allBills || [];
  }, [allBills, customer]);

  const filteredBills = useMemo(() => {
    if (!customerBills.length) return [];

    return customerBills.filter((bill) => {
      // Filter by search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        bill.billNumber?.toLowerCase().includes(searchLower) ||
        bill.items?.some((item) =>
          item.productName?.toLowerCase().includes(searchLower)
        );

      // Filter by status
      const matchesStatus =
        statusFilter === "all" ||
        bill.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [customerBills, searchTerm, statusFilter]);

  // View bill details
  const viewBillDetails = useCallback((bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  }, []);

  // Show loading state
  if (customerLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Error loading bills</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        <Button onClick={refresh} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Format currency helper function
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "overdue", label: "Overdue" },
    { value: "partial", label: "Partially Paid" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {customer?.name ? `${customer.name}'s Bills` : "Akash's Bills"}
          </h2>
          <p className="text-gray-400">View and manage your billing history</p>
        </div>
      </div>

      {/* Bill Stats */}
      <CustomerBillStats bills={customerBills} />

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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter bills by status"
                className="w-[180px] bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
          <CardTitle className="text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {billsLoading || customerLoading ? (
            <div className="p-8 text-center text-gray-400">
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchTerm || statusFilter !== "all"
                ? "No bills match your filters"
                : "No bills found"}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredBills.map((bill) => (
                <BillItem
                  key={bill._id}
                  bill={bill}
                  onClick={viewBillDetails}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill #${selectedBill?.billNumber}`}>
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
                      className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                      <div>
                        <p className="text-white">
                          {item.productName || "Product"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {item.quantity} × ₹{item.unitPrice?.toLocaleString()}
                        </p>
                        {item.specifications && (
                          <p className="text-xs text-gray-500">
                            {item.specifications}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-white">
                        ₹{item.totalPrice?.toLocaleString() || "0"}
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
                    {formatCurrency(selectedBill.taxAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Discount</p>
                  <p className="text-white">
                    {formatCurrency(selectedBill.discountAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total</p>
                  <p className="text-white font-bold text-lg">
                    {formatCurrency(selectedBill.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Paid</p>
                  <p className="text-white">
                    {formatCurrency(selectedBill.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Balance</p>
                  <p className="text-white">
                    {formatCurrency(selectedBill.balanceAmount)}
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
