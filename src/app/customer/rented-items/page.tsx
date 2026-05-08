import CustomerRentedItemsClient from "@/components/customer/customer-rented-items-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerRentedItemsPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  return <CustomerRentedItemsClient />;
}