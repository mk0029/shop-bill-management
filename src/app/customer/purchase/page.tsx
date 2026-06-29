import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { CustomerPurchaseContent } from "@/components/customer/CustomerPurchaseContent";

export default async function CustomerPurchasePage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  return <CustomerPurchaseContent />;
}
