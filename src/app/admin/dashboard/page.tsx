"use client";

import { useDashboardStats } from "@/hooks/use-sanity-data";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { RealtimeInventoryStats } from "@/components/realtime/realtime-inventory";
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
  Wifi,
} from "lucide-react";

export default function AdminDashboard() {
  const stats = useDashboardStats();

  return (
    <RealtimeProvider enableNotifications={false}>
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
                <Wifi className="w-3 h-3 mr-2" />
                Real-time Sync Active
              </Badge>
            </div>
          </div>

          {/* Real-time Bill Stats */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Bill Analytics (Real-time)
            </h2>
            <RealtimeBillStats />
          </div>

          {/* Real-time Inventory Stats */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Inventory Overview (Real-time)
            </h2>
            <RealtimeInventoryStats />
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
    </RealtimeProvider>
  );
}
