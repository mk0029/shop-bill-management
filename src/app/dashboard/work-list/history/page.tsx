import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuth } from "@/lib/server-auth";
import { Navigation } from "@/components/ui/navigation";
import WorkListClient from "@/components/work-list/work-list-client";

export const dynamic = "force-dynamic";

export default async function DashboardWorkListHistoryPage() {
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
          <div className="mb-3">
            <Link
              href="/dashboard/work-list"
              className="inline-flex items-center rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 hover:bg-gray-800"
            >
              Back To Work List
            </Link>
          </div>
          <WorkListClient mode="history" />
        </div>
      </main>
    </div>
  );
}
