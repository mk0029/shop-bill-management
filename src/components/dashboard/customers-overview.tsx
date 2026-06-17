/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, MapPin } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import ResponsiveAccordion from "../ui/responsive-accordion";

export function CustomersOverview() {
  const { customers, isLoading } = useCustomers();
  const { bills } = useBills();

  // Use only client-side data
  const customersData = customers || [];
  const billsData = bills || [];
  const isLoadingEffective = isLoading;
  const { user, role } = useAuthStore();

  // When viewing as a customer, scope data to only their records (no extra API calls)
  const isCustomer = role?.toLowerCase?.() === "customer";
  const currentUserId = user?.id as string | undefined;
  const currentCustomerId = (user as any)?.customerId as string | undefined;

  const visibleCustomers = isCustomer
    ? customersData.filter(
        (c: any) =>
          c?._id === currentUserId || c?.customerId === currentCustomerId,
      )
    : customers;

  const visibleBills = billsData;

  if (isLoadingEffective) {
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
  const activeCustomers = visibleCustomers.filter(
    (customer) => customer.isActive,
  );
  const customersWithPendingBills = visibleCustomers.filter((customer) =>
    visibleBills.some(
      (bill: any) =>
        (bill.customer?._id === customer._id ||
          bill.customer?._ref === customer._id) &&
        bill.paymentStatus === "pending",
    ),
  );

  return (
    <>
      {" "}
      <ResponsiveAccordion title="Customers">
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
      </ResponsiveAccordion>
      <ResponsiveAccordion
        title={
          <CardHeader className="!p-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Customers
            </CardTitle>
          </CardHeader>
        }
      >
        {" "}
        <Card>
          <CardContent>
            <div className="space-y-4">
              {visibleCustomers.slice(0, 5).map((customer) => {
                const customerBills = visibleBills.filter(
                  (bill: any) =>
                    bill.customer?._id === customer._id ||
                    bill.customer?._ref === customer._id,
                );
                const pendingBills = customerBills.filter(
                  (bill: any) => bill.paymentStatus === "pending",
                );
                const totalSpent = customerBills
                  .filter((bill: any) => bill.paymentStatus === "pending")
                  .reduce(
                    (sum: number, bill: any) => sum + (bill.totalAmount || 0),
                    0,
                  );

                return (
                  <div
                    key={customer._id}
                    className="flex min-h-12 flex-row items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl transition hover:bg-white/[0.08] sm:gap-4 sm:p-4"
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
                    <div className="flex gap-2 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
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
      </ResponsiveAccordion>
    </>
  );
}
