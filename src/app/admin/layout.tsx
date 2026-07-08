import type { Metadata } from "next";
import AdminNavigationShell from "@/components/ui/admin-navigation-shell";
import NotificationSyncGate from "@/components/system/notification-sync-gate";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import AdminWelcomeGate from "@/components/admin/AdminWelcomeGate";
import AppBackground from "@/components/ui/AppBackground";
import AdminViewportHeight from "@/components/system/admin-viewport-height";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
    <div className="relative isolate h-[var(--app-vh,100dvh)] overflow-hidden bg-gray-950">
      <AppBackground variant="admin" />
      <div className="relative z-10">
        <AdminViewportHeight />
        <NotificationSyncGate />
        <AdminNavigationShell />
        <AdminWelcomeGate />
      </div>
      <main className="admin-main hide-scroll relative z-10 h-[calc(var(--app-vh,100dvh)-var(--topbar-h,62px))] overflow-y-auto overflow-x-hidden touch-pan-y bg-transparent pt-3 backdrop-blur-[1.5px] xl:pt-10 max-md:px-3 max-sm:px-3">
        <div className="h-full pb-8 py-1 sm:p-2 sm:pb-10 xl:p-6 xl:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
