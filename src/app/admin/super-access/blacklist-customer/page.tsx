import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import BlacklistCustomerClient from "./ui";

export const dynamic = "force-dynamic";

export default async function SuperAccessBlacklistCustomerPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  return <BlacklistCustomerClient />;
}
