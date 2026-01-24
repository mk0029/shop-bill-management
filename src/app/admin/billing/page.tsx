import AdminBillingClient from "@/components/admin/billing-client";
import { getAdminBillingData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin") redirect("/customer/bills");

  const { bills, customers, products, brands, categories } =
    await getAdminBillingData();

  return (
    <AdminBillingClient
      bills={bills as any[]}
      customers={customers as any[]}
      products={products as any[]}
      brands={brands as any[]}
      categories={categories as any[]}
    />
  );
}
