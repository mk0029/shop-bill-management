import CustomerWelcomeGuide from "@/components/customer/CustomerWelcomeGuide";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerWelcomePage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/welcome");

  return <CustomerWelcomeGuide mode="page" />;
}
