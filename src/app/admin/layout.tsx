import AdminNavigationShell from "@/components/ui/admin-navigation-shell";
import NotificationSyncGate from "@/components/system/notification-sync-gate";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
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
  )
    redirect("/customer/bills");

    return (
      <div className="min-h-screen bg-gray-950">
      <NotificationSyncGate />
      <AdminNavigationShell />
      <main className="admin-main pt-3 xl:pt-10 max-md:px-3 max-sm:px-1.5">
        <div className="py-1 sm:p-2 xl:p-6">{children}</div>
      </main>
    </div>
  );
}
