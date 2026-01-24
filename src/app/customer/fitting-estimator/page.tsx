import CustomerFittingsClient from "@/components/customer/customer-fittings-client";
import { getFittingRates } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerFittingEstimatorPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const data = await getFittingRates();

  return <CustomerFittingsClient initialRates={data?.rates ?? null} />;
}
