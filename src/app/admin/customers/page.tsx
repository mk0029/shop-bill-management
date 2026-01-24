import AdminCustomersClient from "@/components/admin/customers-client";
import { getAdminCustomersData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin") redirect("/customer/bills");

  const { customers, bills } = await getAdminCustomersData();

  return (
    <AdminCustomersClient
      customers={customers as any[]}
      bills={bills as any[]}
    />
  );
}
