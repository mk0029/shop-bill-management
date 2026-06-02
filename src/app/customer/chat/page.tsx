import ShopChatClient from "@/components/shop-chat/ShopChatClient";
import ShopChatRouteFrame from "@/components/shop-chat/ShopChatRouteFrame";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function CustomerChatPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  return (
    <ShopChatRouteFrame mode="customer">
      <ShopChatClient mode="customer" />
    </ShopChatRouteFrame>
  );
}
