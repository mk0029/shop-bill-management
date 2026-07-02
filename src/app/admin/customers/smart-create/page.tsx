import SmartCustomerCreatorClient from "@/components/admin/smart-customer-creator";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SmartCreateCustomerPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin" && auth.role !== "super_admin")
    redirect("/customer/bills");

  return <SmartCustomerCreatorClient />;
}
