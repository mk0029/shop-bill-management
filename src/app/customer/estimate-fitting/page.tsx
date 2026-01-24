import EstimateFittingClient from "@/components/customer/estimate-fitting-client";
import { getFittingRates } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EstimateFittingPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const data = await getFittingRates();

  return <EstimateFittingClient data={data as any} />;
}
