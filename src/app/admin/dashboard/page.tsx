"use client";

import { useDashboardStats } from "@/hooks/use-sanity-data";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function AdminDashboard() {
  const stats = useDashboardStats();

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back! Here's what's happening with your shop.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-green-500 border-green-500"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Synced with Sanity
            </Badge>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-white">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    From {stats.totalBills} bills
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
                    ₹{stats.pendingAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {stats.pendingBills} pending bills
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Active Products
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.activeProducts}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    <Package className="inline h-3 w-3 mr-1" />
                    of {stats.totalProducts} total
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Customers
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalCustomers}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    <Users className="inline h-3 w-3 mr-1" />
                    Active customers
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-left">
                <FileText className="h-6 w-6 text-white mb-2" />
                <h3 className="font-medium text-white">Create New Bill</h3>
                <p className="text-sm text-blue-100">
                  Generate a new customer bill
                </p>
              </button>

              <button className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-left">
                <Users className="h-6 w-6 text-white mb-2" />
                <h3 className="font-medium text-white">Add Customer</h3>
                <p className="text-sm text-green-100">
                  Register a new customer
                </p>
              </button>

              <button className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-left">
                <Package className="h-6 w-6 text-white mb-2" />
                <h3 className="font-medium text-white">Add Product</h3>
                <p className="text-sm text-purple-100">
                  Add new product to inventory
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Products Overview */}
        <ProductsOverview />

        {/* Customers Overview */}
        <CustomersOverview />
      </div>
    </div>
  );
}
