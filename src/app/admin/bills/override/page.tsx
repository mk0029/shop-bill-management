import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperAdminBillOverridePage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-white">Bill Overrides</h1>
      <div className="text-gray-400 text-sm">
        Override tools will be implemented here. Access is restricted to Super Admin.
      </div>
    </div>
  );
}
