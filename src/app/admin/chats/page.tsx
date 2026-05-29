import AdminChatsClient from "@/components/admin/chats-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (
    auth.role !== "admin" &&
    auth.role !== "super_admin" &&
    auth.role !== "technician"
  )
    redirect("/customer/bills");

  const adminId = auth.userId;
  if (!adminId) redirect("/");

  return (
    <div className="fixed inset-0 top-0 left-0 h-[100dvh] xl:left-[var(--admin-nav-w)] xl:w-[calc(100%-var(--admin-nav-w))]">
      <AdminChatsClient adminId={adminId} />
    </div>
  );
}
