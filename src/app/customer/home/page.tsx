"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React from "react";
import { useBills } from "@/hooks/use-sanity-data";
import { useAuthStore } from "@/store/auth-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RealtimeProvider,
  useRealtime,
} from "@/components/providers/realtime-provider";
import {
  RealtimeBillList,
  RealtimeBillStats,
} from "@/components/realtime/realtime-bill-list";
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";

// Customer-specific bill stats component that uses filtered data
function CustomerBillStats({ customerBills }: { customerBills: any[] }) {
  const stats = React.useMemo(() => {
    const total = customerBills.length;
    const paid = customerBills.filter(
      (bill) => bill.paymentStatus === "paid"
    ).length;
    const pending = customerBills.filter(
      (bill) => bill.paymentStatus === "pending"
    ).length;
    const overdue = customerBills.filter(
      (bill) => bill.paymentStatus === "overdue"
    ).length;

    const totalAmount = customerBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );
    const paidAmount = customerBills.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);
    const pendingAmount = customerBills
      .filter((bill) => bill.paymentStatus === "pending")
      .reduce(
        (sum, bill) => sum + (bill.balanceAmount || bill.totalAmount || 0),
        0
      );

    return {
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [customerBills]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 sm:gap-4 gap-3">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">
                Total Amount
              </p>
              <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                ₹{stats.totalAmount.toLocaleString()}
              </p>
            </div>
            <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
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
                {stats.paid}
              </p>
            </div>
            <CheckCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-green-400" />
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
                {stats.pending}
              </p>
            </div>
            <Clock className=" h-6 w-6 sm:w-8 sm:h-8  text-yellow-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">
                Overdue
              </p>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-red-400 mt-1">
                {stats.overdue}
              </p>
            </div>
            <AlertTriangle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Customer-specific bill list component that uses filtered data
function CustomerBillList({ customerBills }: { customerBills: any[] }) {
  const displayBills = customerBills.slice(0, 5); // Show max 5 bills

  if (displayBills.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">
          No bills found
        </h3>
        <p className="text-gray-400">
          You don't have any bills yet. Contact us to create your first bill.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayBills.map((bill) => (
        <div
          key={bill._id}
          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {bill.status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : bill.status === "in_progress" ? (
                  <Clock className="h-5 w-5 text-yellow-500" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-white">
                  Bill #{bill.billNumber}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {bill.serviceDate
                      ? new Date(bill.serviceDate).toLocaleDateString()
                      : new Date(bill.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {bill.locationType}
                  </span>
                  <span className="capitalize">{bill.serviceType}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-white">
                ₹{bill.totalAmount?.toLocaleString() || 0}
              </p>
              {bill.balanceAmount > 0 && (
                <p className="text-sm text-yellow-500">
                  ₹{bill.balanceAmount.toLocaleString()} pending
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Badge
                variant={
                  bill.status === "completed"
                    ? "default"
                    : bill.status === "in_progress"
                    ? "secondary"
                    : "outline"
                }
              >
                {bill.status?.replace("_", " ")}
              </Badge>
              <Badge
                variant={
                  bill.paymentStatus === "paid"
                    ? "default"
                    : bill.paymentStatus === "pending"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {bill.paymentStatus}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerHomeContent() {
  const { user } = useAuthStore();
  const { isConnected } = useRealtime();

  // Use the same bill store as admin panel for realtime updates
  const {
    bills: allBills,
    loading: billsLoading,
    fetchBills,
  } = useSanityBillStore();

  // Initialize the bill store and realtime listeners
  React.useEffect(() => {
    fetchBills();
    // Note: Realtime listeners are automatically initialized by the RealtimeProvider
  }, [fetchBills]);

  if (billsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Filter bills for this customer from the realtime store
  const customerBills = user
    ? allBills.filter(
        (bill) =>
          (bill.customer as any)?._ref === user.id ||
          (bill.customer as any)?._id === user.id ||
          bill.customer === user.id
      )
    : [];

  // Filter bills for this customer only
  console.log(
    `📋 Customer ${user?.name} has ${customerBills.length} bills out of ${allBills.length} total`
  );

  // Calculate stats
  const totalBills = customerBills.length;
  const pendingBills = customerBills.filter(
    (bill) => bill.paymentStatus === "pending"
  );
  const completedBills = customerBills.filter(
    (bill) => bill.status === "completed"
  );
  const totalSpent = customerBills
    .filter((bill) => bill.paymentStatus === "paid")
    .reduce((sum, bill) => sum + bill.totalAmount, 0);
  const pendingAmount = pendingBills.reduce(
    (sum, bill) => sum + bill.balanceAmount,
    0
  );

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user?.name || "Customer"}!
          </h1>
          <p className="text-gray-400 mt-1">
            Here&apos;s your billing summary and recent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              isConnected
                ? "text-green-500 border-green-500"
                : "text-red-500 border-red-500"
            }>
            <div
              className={`w-2 h-2 ${
                isConnected ? "bg-green-500" : "bg-red-500"
              } rounded-full mr-2`}></div>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Real-time Stats Cards - Only for this customer */}
      <CustomerBillStats customerBills={customerBills} />

      {/* Recent Bills - Real-time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between max-sm:pb-1">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Bills (Live Updates)
          </CardTitle>
          <Link href="/customer/bills">
            <Button variant="outline" size="sm">
              View All Bills
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <CustomerBillList customerBills={customerBills} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/customer/bills">
              <button
                type="button"
                className="w-full p-3 sm:p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-left">
                <FileText className="h-6 w-6 text-white mb-0.5 sm:mb-1 md:mb-2" />
                <h3 className="font-medium text-white">View All Bills</h3>
                <p className="text-sm text-blue-100">
                  See your complete billing history
                </p>
              </button>
            </Link>

            <Link href="/customer/profile">
              <button
                type="button"
                className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-left">
                <User className="h-6 w-6 text-white mb-0.5 sm:mb-1 md:mb-2" />
                <h3 className="font-medium text-white">Update Profile</h3>
                <p className="text-sm text-green-100">
                  Manage your account information
                </p>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerHome() {
  return (
    <RealtimeProvider enableNotifications={true}>
      <CustomerHomeContent />
    </RealtimeProvider>
  );
}
