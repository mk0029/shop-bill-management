import { CustomersOverview } from "@/components/dashboard/customers-overview";
import { ProductsOverview } from "@/components/dashboard/products-overview";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { Card } from "@/components/ui/card";
import { productApiService, brandApiService, categoryApiService, userApiService, billApiService } from "@/lib/sanity-api-service";
import QuickActions from "@/components/dashboard/quick-actions";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Page-only SSR: fetch all required data on the server
  const [productsRes, brandsRes, categoriesRes, customersRes, billsRes] = await Promise.all([
    productApiService.getAllProducts(),
    brandApiService.getAllBrands(),
    categoryApiService.getAllCategories(),
    userApiService.getCustomers(),
    billApiService.getAllBills(),
  ]);

  const products = productsRes.success ? (productsRes.data as any[]) : [];
  const brands = brandsRes.success ? (brandsRes.data as any[]) : [];
  const categories = categoriesRes.success ? (categoriesRes.data as any[]) : [];
  const customers = customersRes.success ? (customersRes.data as any[]) : [];
  const bills = billsRes.success ? (billsRes.data as any[]) : [];

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
      <div className="min-h-screen bg-gray-900 p-3 sm:p-4 md:p-6">
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
