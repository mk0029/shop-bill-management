"use client";

import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { CashbookDashboardSection } from "@/components/dashboard/cashbook-dashboard-section";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useEffect } from "react";
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

  return (
    <RealtimeProvider enableNotifications={false}>
      <div
        data-dashboard-loaded="true"
        className="h-full p-1 sm:p-4 md:p-6"
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 max-md:space-y-4 md:space-y-8">
          <div className="flex items-center justify-between max-sm:px-2">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
            </div>
          </div>

          <CashbookDashboardSection />

          <WorkListClient embedded />

          <AdminNotificationPanel />

          <ProductsOverview />

          <CustomersOverview />
        </div>
      </div>
    </RealtimeProvider>
  );
}
