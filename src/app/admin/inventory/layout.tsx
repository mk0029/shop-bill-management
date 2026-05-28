import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (
    auth.role !== "admin" &&
    auth.role !== "super_admin" &&
    auth.role !== "technician"
  ) {
    redirect("/dashboard/work-list");
  }
  return <>{children}</>;
}
