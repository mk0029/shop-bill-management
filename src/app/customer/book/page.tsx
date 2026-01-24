import CustomerBookClient from "@/components/customer/customer-book-client";
import CustomerDataHydrator from "@/components/customer/customer-data-hydrator";
import { getCustomerBillsData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerBillingBook() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const { customer, bills } = await getCustomerBillsData({
    userId: auth.userId,
    customerId: auth.customerId,
  });

  return (
    <>
      <CustomerDataHydrator customer={customer as any} bills={bills as any[]} />
      <CustomerBookClient bills={bills as any[]} />
    </>
  );
}
