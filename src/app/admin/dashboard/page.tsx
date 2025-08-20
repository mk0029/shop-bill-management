"use client";

import { useEffect } from "react";
import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { RealtimeInventoryStats } from "@/components/realtime/realtime-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FileText, Package, Users } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import Link from "next/link";

export default function AdminDashboard() {
  const { fetchProducts, fetchInventorySummary } = useInventoryStore();
  const { fetchBills } = useSanityBillStore();

  // Initialize realtime sync for the dashboard
  const { refreshData } = useRealtimeSync({
    enableNotifications: false, // Disable notifications on dashboard
    enableAutoRefresh: true,
    documentTypes: ["bill", "product", "stockTransaction"],
  });
  const quickActions = [
    {
      icon: FileText,
      title: "Create New Bill",
      description: "Generate a new customer bill",
      bg: "bg-blue-600",
      hover: "hover:bg-blue-700",
      text: "text-blue-100",
      url: "/admin/billing/create?fresh=1",
    },
    {
      icon: Users,
      title: "Add Customer",
      description: "Register a new customer",
      bg: "bg-green-600",
      hover: "hover:bg-green-700",
      text: "text-green-100",
      url: "/admin/customers/add",
    },
    {
      icon: Package,
      title: "Add Product",
      description: "Add new product to inventory",
      bg: "bg-purple-600",
      hover: "hover:bg-purple-700",
      text: "text-purple-100",
      url: "/admin/inventory/add",
    },
  ];

  // Initialize data when dashboard loads
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        console.log("🚀 Initializing dashboard data...");
        await Promise.all([
          fetchProducts(),
          fetchInventorySummary(),
          fetchBills(),
        ]);
        console.log("✅ Dashboard data initialized");
      } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
      }
    };

    initializeDashboard();
  }, [fetchProducts, fetchInventorySummary, fetchBills]);

  return (
    <RealtimeProvider enableNotifications={false}>
      <div className="min-h-screen bg-gray-900 p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Welcome back! Here's what's happening with your shop.
              </p>
            </div>
          </div>

          {/* Real-time Bill Stats */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Bill Analytics
            </h2>
            <RealtimeBillStats key="dashboard-stats" />
          </div>

          {/* Real-time Inventory Stats */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Inventory Overview
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      href={action.url}
                      key={index}
                      onClick={() => {
                        try {
                          if (action.url.startsWith("/admin/billing/create")) {
                            localStorage.setItem("bill_create_skip_restore", "1");
                          }
                        } catch {}
                      }}
                      aria-label={action.title}
                      className={`w-full min-h-12 p-3 sm:p-4 rounded-lg transition-colors text-left flex items-center gap-x-4 md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 ring-offset-gray-900 ${action.bg} ${action.hover}`}>
                      <Icon className="h-6 w-6 text-white mb-0.5 sm:mb-1 md:mb-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-white">
                          {action.title}
                        </h3>
                        <p className={`text-sm ${action.text}`}>
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
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
