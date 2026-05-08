import AdminRentToolsCreateClient from "@/components/admin/rent-tools-create-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminRentToolsCreatePage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin" && auth.role !== "super_admin") redirect("/customer/bills");
  return <AdminRentToolsCreateClient />;
}