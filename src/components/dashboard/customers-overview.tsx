"use client";

import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, MapPin } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useEffect } from "react";
import { useCustomerBillRealtime } from "@/hooks/use-customer-bill-realtime";
import { useCustomerBillsStore } from "@/store/customer-bills-store";

export function CustomersOverview() {
  const { customers, isLoading } = useCustomers();
  const { bills } = useBills();
  const { user, role } = useAuthStore();
  const { bills: customerBills, fetchBillsByCustomer } = useCustomerBillsStore();

  // When viewing as a customer, scope data to only their records (no extra API calls)
  const isCustomer = role?.toLowerCase?.() === "customer";
  const currentUserId = user?.id as string | undefined;
  const currentCustomerId = (user as any)?.customerId as string | undefined;

  // Start realtime subscription strictly scoped to this customer
  useCustomerBillRealtime({ _id: currentUserId, customerId: currentCustomerId });

  // Fetch initial bills into the customer store (id-based targeting per recent fixes)
  useEffect(() => {
    if (!isCustomer) return;
    if (!currentUserId && !currentCustomerId) return;
    fetchBillsByCustomer({ _id: currentUserId, customerId: currentCustomerId }).catch(() => {
      /* silent */
    });
  }, [isCustomer, currentUserId, currentCustomerId, fetchBillsByCustomer]);

  const visibleCustomers = isCustomer
    ? customers.filter(
        (c: any) => c?._id === currentUserId || c?.customerId === currentCustomerId
      )
    : customers;

  // Bills source: for customers, use their dedicated realtime store; for others, use global bills
  const visibleBills = isCustomer
    ? customerBills
    : bills;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate customer stats
  const activeCustomers = visibleCustomers.filter((customer) => customer.isActive);
  const customersWithPendingBills = visibleCustomers.filter((customer) =>
    visibleBills.some(
      (bill: any) =>
        (bill.customer?._id === customer._id || bill.customer?._ref === customer._id) &&
        bill.paymentStatus === "pending"
    )
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Customers
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {visibleCustomers.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Active Customers
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {activeCustomers.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Pending Payments
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {customersWithPendingBills.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between max-sm:pb-1">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Customers
          </CardTitle>
          <Button size="sm" className="flex items-center gap-1 sm:gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 ring-offset-gray-900">
            <Plus className="h-4 w-4" />
            <span className="max-sm:hidden"> Add Customer</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleCustomers.slice(0, 5).map((customer) => {
              const customerBills = visibleBills.filter(
                (bill: any) => bill.customer?._id === customer._id || bill.customer?._ref === customer._id
              );
              const pendingBills = customerBills.filter(
                (bill: any) => bill.paymentStatus === "pending"
              );
              const totalSpent = customerBills
                .filter((bill: any) => bill.paymentStatus === "pending")
                .reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0);

              return (
                <div
                  key={customer._id}
                  className="flex flex-row items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg min-h-12"
                >
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full hidden sm:flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {customer.name}
                        </h3>
                        <div className="flex  items-center gap-3 sm:gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {customer.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-fit gap-2 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="font-medium text-white">
                        ₹{totalSpent.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">
                        {customerBills.length} bills
                      </p>
                    </div>
                    <div className=" hidden md:flex flex-col gap-1">
                      <Badge
                        variant={customer.isActive ? "default" : "secondary"}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {pendingBills.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {pendingBills.length} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
