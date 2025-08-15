"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// Hooks
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useCustomerData } from "@/hooks/use-customer-data";
import { useAuthStore } from "@/store/auth-store";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FilePlus,
  List,
  User,
  Calendar,
  MapPin,
} from "lucide-react";

// Import Bill type from store
import type { Bill } from "@/store/sanity-bill-store";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("₹", "₹");
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-green-500/10 text-green-400";
    case "pending":
      return "bg-yellow-500/10 text-yellow-400";
    case "overdue":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
};

// Format date helper
const formatDate = (dateString: string | Date) => {
  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

// Customer-specific bill stats component that uses filtered data
function CustomerBillStats({ customerBills = [] }: { customerBills: Bill[] }) {
  const stats = useMemo(() => {
    // Count bills by status
    const paidBills = customerBills.filter(
      (bill) => bill.paymentStatus === "paid"
    );
    const pendingBills = customerBills.filter(
      (bill) => bill.paymentStatus === "pending"
    );
    const overdueBills = customerBills.filter(
      (bill) => bill.paymentStatus === "overdue"
    );
    const partialBills = customerBills.filter(
      (bill) => bill.paymentStatus === "partial"
    );

    // Calculate amounts
    const totalAmount = customerBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    const paidAmount = paidBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );
    const partialPaidAmount = partialBills.reduce(
      (sum, bill) => sum + (bill.paidAmount || 0),
      0
    );
    const pendingAmount = pendingBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );
    const partialPendingAmount = partialBills.reduce(
      (sum, bill) => sum + (bill.balanceAmount || 0),
      0
    );

    return {
      total: customerBills.length,
      paid: paidBills.length,
      pending: pendingBills.length,
      overdue: overdueBills.length,
      partial: partialBills.length,
      totalAmount,
      paidAmount: paidAmount + partialPaidAmount,
      pendingAmount: pendingAmount + partialPendingAmount,
    };
  }, [customerBills]);

  const statsConfig = [
    {
      title: "Total Amount",
      value: formatCurrency(stats.totalAmount),
      icon: FileText,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Paid",
      value: formatCurrency(stats.paidAmount),
      subtitle: `${stats.paid} bill${stats.paid !== 1 ? "s" : ""}${stats.partial ? ` + ${stats.partial} partial` : ""}`,
      icon: CheckCircle,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending",
      value: formatCurrency(stats.pendingAmount),
      subtitle: `${stats.pending} bill${stats.pending !== 1 ? "s" : ""}${stats.overdue ? ` (${stats.overdue} overdue)` : ""}`,
      icon: Clock,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Action Required",
      value: stats.overdue > 0 ? `${stats.overdue} overdue` : "All clear",
      subtitle: stats.overdue > 0 ? "Payment overdue" : "No pending actions",
      icon: AlertTriangle,
      iconColor: stats.overdue > 0 ? "text-red-500" : "text-green-500",
      bgColor: stats.overdue > 0 ? "bg-red-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsConfig.map((stat, index) => (
        <Card
          key={index}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Customer-specific bill list component that uses filtered data
function CustomerBillList({ customerBills = [] }: { customerBills: Bill[] }) {
  const router = useRouter();

  if (customerBills.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-gray-600" />
        <h3 className="mt-2 text-sm font-medium text-gray-300">
          No bills found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any bills yet.
        </p>
      </div>
    );
  }

  const handleViewBill = (billId: string) => {
    router.push(`/customer/bills/${billId}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Recent Bills</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          onClick={() => router.push("/customer/bills")}>
          View all <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {customerBills.slice(0, 5).map((bill) => (
        <Card
          key={bill._id}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
          onClick={() => handleViewBill(bill._id)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-white">
                    Bill #{bill.billNumber}
                  </h4>
                  <Badge className={getStatusColor(bill.paymentStatus)}>
                    {bill.paymentStatus.charAt(0).toUpperCase() +
                      bill.paymentStatus.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatDate(bill.serviceDate || bill.createdAt)}</span>
                  <span className="text-white font-medium">
                    {formatCurrency(bill.totalAmount || 0)}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CustomerHomeContent() {
  const { user } = useAuthStore();
  const {
    customer,
    loading: customerLoading,
    error: customerError,
    refresh,
  } = useCustomerData();
  const {
    bills,
    loading: billsLoading,
    fetchBillsByCustomer,
  } = useSanityBillStore();
  const router = useRouter();

  // Add timeout for loading state
  const [showTimeout, setShowTimeout] = React.useState(false);

  // Track if bills have been fetched to prevent duplicate requests
  const billsFetchedRef = React.useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerLoading || billsLoading) {
        setShowTimeout(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timer);
  }, [customerLoading, billsLoading]);

  // Debug logging
  useEffect(() => {
    console.log("CustomerHomeContent - Debug Info:", {
      user: user
        ? { id: user._id, name: user.name, secretKey: user.secretKey }
        : null,
      customer: customer ? { id: customer._id, name: customer.name } : null,
      customerLoading,
      billsLoading,
      customerError,
      billsCount: bills?.length || 0,
    });
  }, [user, customer, customerLoading, billsLoading, customerError, bills]);

  // Reset bills fetched flag when customer changes
  useEffect(() => {
    billsFetchedRef.current = false;
  }, [customer?._id]);

  // Fetch customer's bills when customer is loaded
  useEffect(() => {
    if (customer?._id && !billsFetchedRef.current && !billsLoading) {
      console.log("Fetching bills for customer:", customer._id);
      billsFetchedRef.current = true;
      fetchBillsByCustomer(customer._id);
    }
  }, [customer?._id, billsLoading]); // Keep billsLoading to prevent fetching while already loading

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refresh();
      if (customer?._id) {
        await fetchBillsByCustomer(customer._id);
      }
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    }
  };

  // Show loading with timeout message
  if (customerLoading || billsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading customer data...</p>
        <p className="text-gray-500 text-xs mt-2">
          Check console for debug info
        </p>
        {showTimeout && (
          <div className="mt-4 text-center">
            <p className="text-yellow-400 text-sm mb-2">
              Loading is taking longer than expected
            </p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Retry Loading
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Error loading customer data</p>
        <p className="text-sm text-gray-500 mt-2">
          {customerError?.message || "Failed to load customer information"}
        </p>
        <Button onClick={handleRefresh} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const handleViewBill = (billId: string) => {
    router.push(`/customer/bills/${billId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {customer.name}!
          </h1>
          <p className="text-gray-400">Here&apos;s your billing overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <CustomerBillStats customerBills={bills} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <CustomerBillList customerBills={bills} />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Quick Actions
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button className="w-full justify-start" asChild>
                  <Link
                    href="/customer/bills/new"
                    className="flex items-center">
                    <FilePlus className="h-4 w-4 mr-2" />
                    New Bill
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/customer/bills" className="flex items-center">
                    <List className="h-4 w-4 mr-2" />
                    View All Bills
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Account Summary
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Customer ID
                    </p>
                    <p className="text-sm text-white">
                      {customer.customerId || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Member Since
                    </p>
                    <p className="text-sm text-white">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Location
                    </p>
                    <p className="text-sm text-white">
                      {customer.location || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Recent Activity
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {bills.slice(0, 3).map((bill) => (
                  <div key={bill._id} className="flex items-start space-x-3">
                    <div className="p-1.5 rounded-full bg-gray-800">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        Bill #{bill.billNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(bill.serviceDate || bill.createdAt)} •{" "}
                        {formatCurrency(bill.totalAmount || 0)}
                      </p>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                      {bill.paymentStatus.charAt(0).toUpperCase() +
                        bill.paymentStatus.slice(1)}
                    </div>
                  </div>
                ))}
                {bills.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CustomerHome() {
  return <CustomerHomeContent />;
}
