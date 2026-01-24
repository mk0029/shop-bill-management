import CustomerBillsClient from "@/components/customer/customer-bills-client";
import { getServerAuth } from "@/lib/server-auth";
import { getCustomerBillsData } from "@/lib/server-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerBillsPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const { customer, bills } = await getCustomerBillsData({
    userId: auth.userId,
    customerId: auth.customerId,
  });

  return (
    <CustomerBillsClient customer={customer as any} bills={bills as any[]} />
  );
}
