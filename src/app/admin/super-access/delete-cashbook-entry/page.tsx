import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import DeleteCashbookEntryClient from "./ui";

export const dynamic = "force-dynamic";

export default async function SuperAccessDeleteCashbookEntryPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  return <DeleteCashbookEntryClient />;
}
