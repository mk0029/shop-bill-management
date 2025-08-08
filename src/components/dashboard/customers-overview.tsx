"use client";

import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, MapPin } from "lucide-react";

export function CustomersOverview() {
  const { customers, isLoading } = useCustomers();
  const { bills } = useBills();

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
  const activeCustomers = customers.filter((customer) => customer.isActive);
  const customersWithPendingBills = customers.filter((customer) =>
    bills.some(
      (bill) =>
        bill.customer._id === customer._id && bill.paymentStatus === "pending"
    )
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Customers
                </p>
                <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                  {customers.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
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
          <CardContent>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Customers
          </CardTitle>
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.slice(0, 5).map((customer) => {
              const customerBills = bills.filter(
                (bill) => bill.customer._id === customer._id
              );
              const pendingBills = customerBills.filter(
                (bill) => bill.paymentStatus === "pending"
              );
              const totalSpent = customerBills
                .filter((bill) => bill.paymentStatus === "paid")
                .reduce((sum, bill) => sum + bill.totalAmount, 0);

              return (
                <div
                  key={customer._id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {customer.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
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
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-white">
                        ₹{totalSpent.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">
                        {customerBills.length} bills
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
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
