import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import CustomerNicknameMigrationClient from "./client";

export const dynamic = "force-dynamic";

export default async function CustomerNicknameMigrationPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin" && auth.role !== "admin") redirect("/unauthorized");

  return <CustomerNicknameMigrationClient />;
}
