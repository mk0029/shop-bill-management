import ShopStatusMessagesSettings from "@/components/settings/ShopStatusMessagesSettings";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShopStatusMessagesPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin" && auth.role !== "super_admin") redirect("/admin/settings");

  return <ShopStatusMessagesSettings />;
}
