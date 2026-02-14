import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperAdminBillEditPage({
  params,
}: {
  params: { billId: string };
}) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  const billId = params.billId;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-white">Edit Bill</h1>
      <div className="text-gray-300">Bill ID: {billId}</div>
      <div className="text-gray-400 text-sm">
        Bill editor UI will be implemented here. Access is restricted to Super Admin.
      </div>
    </div>
  );
}
