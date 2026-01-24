import AdminInventoryClient from "@/components/admin/inventory-client";
import { getAdminInventoryData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin") redirect("/customer/bills");

  const { products, brands, categories } = await getAdminInventoryData();

  return (
    <AdminInventoryClient
      products={products as any[]}
      brands={brands as any[]}
      categories={categories as any[]}
    />
  );
}
