"use client";

import { useBills } from "@/hooks/use-sanity-data";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function CustomerHome() {
  const { bills, getBillsByCustomer, isLoading } = useBills();
  const { user } = useAuthStore();

  // Debug logs
  console.log('CustomerHome user:', user);
  console.log('CustomerHome bills:', bills);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Get customer's bills using the user's _id from Sanity
  const customerBills = user ? getBillsByCustomer(user.id) : [];

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.name || "Customer"}!
          </h1>
          <p className="text-gray-400 mt-1">
            Here&apos;s your billing summary and recent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-green-500 border-green-500"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Connected
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Bills
                </p>
                <p className="text-2xl font-bold text-white">{totalBills}</p>
                <p className="text-xs text-blue-500 mt-1">
                  <FileText className="inline h-3 w-3 mr-1" />
                  All time
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-white">
                  ₹{totalSpent.toLocaleString()}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  <DollarSign className="inline h-3 w-3 mr-1" />
                  Paid bills
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  ₹{pendingAmount.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-500 mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {pendingBills.length} bills
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Bills
          </CardTitle>
          <Link href="/customer/bills">
            <Button variant="outline" size="sm">
              View All Bills
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {customerBills.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No bills found
              </h3>
              <p className="text-gray-400">
                You don&apos;t have any bills yet. Contact us to create your first bill.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customerBills.slice(0, 5).map((bill) => (
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
                            {new Date(bill.serviceDate).toLocaleDateString()}
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
                        ₹{bill.totalAmount.toLocaleString()}
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
                        {bill.status.replace("_", " ")}
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
          )}
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
              <button className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-left">
                <FileText className="h-6 w-6 text-white mb-2" />
                <h3 className="font-medium text-white">View All Bills</h3>
                <p className="text-sm text-blue-100">
                  See your complete billing history
                </p>
              </button>
            </Link>

            <Link href="/customer/profile">
              <button className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-left">
                <User className="h-6 w-6 text-white mb-2" />
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
