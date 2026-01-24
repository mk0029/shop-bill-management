import CustomerDataHydrator from "@/components/customer/customer-data-hydrator";
import CustomerNotificationsClient from "@/components/customer/customer-notifications-client";
import { getCustomerBillsData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerNotificationsPage() {
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
      <CustomerNotificationsClient />
    </>
  );
}
