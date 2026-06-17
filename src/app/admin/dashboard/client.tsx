"use client";

import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useEffect } from "react";
import QuickActions from "@/components/dashboard/quick-actions";
import AdminNotificationPanel from "@/components/dashboard/admin-notification-panel";
import WorkListClient from "@/components/work-list/work-list-client";

export default function DashboardClient() {
  const { user, role } = useAuthStore();
  const { loadAdminData } = useDataStore();

  useEffect(() => {
    if (user?.id && role === "admin") {
      loadAdminData({ userId: user.id });
    }
  }, [user?.id, role, loadAdminData]);

  const quickActions = [
    {
      iconName: "file" as const,
      title: "Create New Bill",
      description: "Generate a new customer bill",
      bg: "bg-blue-600/40 backdrop-blur-[2px] trasnation-all duration-300 ",
      hover: "hover:bg-blue-700/40",
      text: "text-blue-100",
      url: "/admin/billing/create?fresh=1",
    },
    {
      iconName: "users" as const,
      title: "Add Customer",
      description: "Register a new customer",
      bg: "bg-green-600/40 backdrop-blur-[2px] trasnation-all duration-300 ",
      hover: "hover:bg-green-700/40",
      text: "text-green-100",
      url: "/admin/customers/add",
    },
    {
      iconName: "package" as const,
      title: "Add Product",
      description: "Add new product to inventory",
      bg: "bg-purple-600/40 backdrop-blur-[2px] trasnation-all duration-300 ",
      hover: "hover:bg-purple-700/40",
      text: "text-purple-100",
      url: "/admin/inventory/add",
    },
    {
      iconName: "file" as const,
      title: "Add Cash Entry",
      description: "Add new cash entry",
      bg: "bg-yellow-500/40 backdrop-blur-[2px] trasnation-all duration-300 ",
      hover: "hover:bg-yellow-700/40",
      text: "text-yellow-100",
      url: "/admin/cash-book",
    },
  ];

  return (
    <RealtimeProvider enableNotifications={false}>
      <div
        data-dashboard-loaded="true"
        className="min-h-screen p-1 sm:p-4 md:p-6"
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 max-md:space-y-4 md:space-y-8">
          <div className="flex items-center justify-between max-sm:px-2">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
            </div>
          </div>

          <Card>
            <QuickActions actions={quickActions} />
          </Card>

          <WorkListClient embedded />

          <AdminNotificationPanel />

          <ProductsOverview />

          <CustomersOverview />
        </div>
      </div>
    </RealtimeProvider>
  );
}
