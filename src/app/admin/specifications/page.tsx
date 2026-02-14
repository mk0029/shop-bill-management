import SpecificationsClient from "@/components/admin/specifications-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SpecificationsManagementPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin" && auth.role !== "super_admin")
    redirect("/customer/bills");

  return <SpecificationsClient />;
}
