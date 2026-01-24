import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { Card } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import QuickActions from "@/components/dashboard/quick-actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin") redirect("/customer/bills");

  const { products, brands, categories, customers, bills } =
    await getAdminDashboardData();

  // Realtime is provided by RealtimeProvider below for live updates after SSR
  const quickActions = [
    {
      iconName: "file" as const,
      title: "Create New Bill",
      description: "Generate a new customer bill",
      bg: "bg-blue-600",
      hover: "hover:bg-blue-700",
      text: "text-blue-100",
      url: "/admin/billing/create?fresh=1",
    },
    {
      iconName: "users" as const,
      title: "Add Customer",
      description: "Register a new customer",
      bg: "bg-green-600",
      hover: "hover:bg-green-700",
      text: "text-green-100",
      url: "/admin/customers/add",
    },
    {
      iconName: "package" as const,
      title: "Add Product",
      description: "Add new product to inventory",
      bg: "bg-purple-600",
      hover: "hover:bg-purple-700",
      text: "text-purple-100",
      url: "/admin/inventory/add",
    },
    {
      iconName: "file" as const,
      title: "Add Cash Entry",
      description: "Add new cash entry",
      bg: "bg-yellow-500",
      hover: "hover:bg-yellow-700",
      text: "text-yellow-100",
      url: "/admin/cash-book",
    },
  ];

  return (
    <RealtimeProvider enableNotifications={false}>
      <div
        data-dashboard-loaded="true"
        className="min-h-screen bg-gray-900 p-3 sm:p-4 md:p-6"
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 max-md:space-y-4 md:space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
            </div>
          </div>

          {/* Real-time Bill Stats */}
          {/* <div>
            <h2 className="text-xl font-semibold text-white mb-4">Bill Analytics</h2>
            <RealtimeBillStats key="dashboard-stats" />
          </div> */}

          {/* Quick Actions */}
          <Card>
            <QuickActions actions={quickActions} />
          </Card>

          {/* Products Overview (SSR initial data) */}
          <ProductsOverview initial={{ products, brands, categories }} />

          {/* Customers Overview (SSR initial data) */}
          <CustomersOverview initial={{ customers, bills }} />
        </div>
      </div>
    </RealtimeProvider>
  );
}
