import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { Navigation } from "@/components/ui/navigation";
import WorkListClient from "@/components/work-list/work-list-client";

export const dynamic = "force-dynamic";

export default async function DashboardWorkListPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (!["admin", "super_admin", "technician"].includes(String(auth.role || ""))) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <main className="pt-3 xl:pt-10 xl:ml-64 max-md:px-3 max-sm:px-1.5">
        <div className="py-1 sm:p-2 xl:p-6">
          <WorkListClient />
        </div>
      </main>
    </div>
  );
}

