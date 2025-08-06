"use client";

import {
  useSanityRealtime,
  useSanityAlerts,
  useSanityStats,
  useSanityOperations,
} from "@/hooks/useSanityRealtime";
import {
  SanityRealtimeStatus,
  DetailedRealtimeStatus,
} from "@/components/providers/SanityRealtimeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Package,
  Users,
  FileText,
  TrendingUp,
  Plus,
} from "lucide-react";
import { useState } from "react";

export function RealtimeDashboard() {
  const { isConnected } = useSanityRealtime();
  const alerts = useSanityAlerts();
  const stats = useSanityStats();
  const operations = useSanityOperations();
  const [isCreating, setIsCreating] = useState(false);

  // Demo function to create a test brand
  const createTestBrand = async () => {
    setIsCreating(true);
    try {
      const success = await operations.brands.create({
        name: `Test Brand ${Date.now()}`,
        description: "A test brand created via real-time demo",
        isActive: true,
        contactInfo: {
          email: "test@example.com",
          phone: "+1234567890",
        },
      });

      if (success) {
        console.log("✅ Test brand created successfully");
      }
    } catch (error) {
      console.error("❌ Failed to create test brand:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Live data synchronized across all devices via Sanity
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={createTestBrand}
            disabled={isCreating || !isConnected}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Test Brand"}
          </Button>
          <SanityRealtimeStatus />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{stats.products.total}</p>
                <p className="text-xs text-green-600">
                  {stats.products.active} active
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.users.total}</p>
                <p className="text-xs text-blue-600">
                  {stats.users.customers} customers
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold">{stats.bills.total}</p>
                <p className="text-xs text-orange-600">
                  {stats.bills.pending} pending
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{stats.bills.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">
                  {stats.bills.completed} completed
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.totalAlerts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Alerts ({alerts.totalAlerts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Inventory Alerts */}
              {alerts.inventory.lowStockCount > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Low Stock Products ({alerts.inventory.lowStockCount})
                  </h4>
                  <div className="space-y-2">
                    {alerts.inventory.lowStock.slice(0, 3).map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-2 bg-orange-50 rounded">
                        <span className="text-sm">{product.name}</span>
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-600">
                          {product.inventory.currentStock} left
                        </Badge>
                      </div>
                    ))}
                    {alerts.inventory.lowStock.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{alerts.inventory.lowStock.length - 3} more products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Out of Stock */}
              {alerts.inventory.outOfStockCount > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Out of Stock ({alerts.inventory.outOfStockCount})
                  </h4>
                  <div className="space-y-2">
                    {alerts.inventory.outOfStock.slice(0, 3).map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm">{product.name}</span>
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-600">
                          Out of Stock
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue Payments */}
              {alerts.bills.overdueCount > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Overdue Payments ({alerts.bills.overdueCount})
                  </h4>
                  <div className="space-y-2">
                    {alerts.bills.overdue.slice(0, 3).map((bill) => (
                      <div
                        key={bill._id}
                        className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm">{bill.billNumber}</span>
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-600">
                          ₹{bill.balanceAmount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailedRealtimeStatus />

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• All data changes sync automatically across devices</li>
              <li>• Create/update/delete operations appear instantly</li>
              <li>• No page refresh needed - everything updates live</li>
              <li>• Works with multiple users simultaneously</li>
              <li>• Powered by Sanity's real-time infrastructure</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
