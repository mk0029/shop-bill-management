import AdminRepairRequestsClient from "@/components/admin/repair-requests-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminRepairRequestsPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (!["admin", "super_admin", "technician"].includes(String(auth.role || ""))) {
    redirect("/customer/bills");
  }

  return <AdminRepairRequestsClient />;
}
