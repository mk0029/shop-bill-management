import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ChatAliasPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role === "customer") redirect("/customer/chat");
  if (
    auth.role === "admin" ||
    auth.role === "super_admin" ||
    auth.role === "technician"
  ) {
    redirect("/admin/chats");
  }
  redirect("/unauthorized");
}

