import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { Navigation } from "@/components/ui/navigation";
import UnifiedWorkClient from "@/components/admin/unified-work-client";
import AppBackground from "@/components/ui/AppBackground";
import AdminViewportHeight from "@/components/system/admin-viewport-height";

export const dynamic = "force-dynamic";

export default async function DashboardWorkListPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (!["admin", "super_admin", "technician"].includes(String(auth.role || ""))) {
    redirect("/unauthorized");
  }

  return (
    <div className="relative isolate h-[var(--app-vh,100dvh)] overflow-hidden flex flex-col bg-gray-950">
      <AppBackground variant="admin" />
      <AdminViewportHeight />
      <Navigation />
      <main className="admin-main relative z-10 flex-1 min-h-0 overflow-hidden pt-3 backdrop-blur-[1.5px] xl:pt-10 max-md:px-3 max-sm:px-1.5">
        <div className="flex flex-col min-h-0 h-full py-1 sm:p-2 xl:p-6 max-w-7xl mx-auto">
          <UnifiedWorkClient />
        </div>
      </main>
    </div>
  );
}
