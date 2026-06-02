import ShopChatClient from "@/components/shop-chat/ShopChatClient";
import ShopChatRouteFrame from "@/components/shop-chat/ShopChatRouteFrame";
import { getAdminCustomersData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function AdminChatPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin" && auth.role !== "super_admin" && auth.role !== "technician") redirect("/unauthorized");

  const { customers } = await getAdminCustomersData();

  return (
    <ShopChatRouteFrame mode="admin">
      <ShopChatClient mode="admin" initialCustomers={customers as any[]} />
    </ShopChatRouteFrame>
  );
}
