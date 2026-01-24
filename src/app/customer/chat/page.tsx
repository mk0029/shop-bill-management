import CustomerChatClient from "@/components/customer/customer-chat-client";
import { getCustomerChatRooms } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerChatPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const customerId = auth.userId;
  if (!customerId) redirect("/");

  const rooms = await getCustomerChatRooms(customerId);
  const customerName = (auth.user?.name as string) || "Customer";

  return (
    <CustomerChatClient
      rooms={rooms as any}
      customerId={customerId}
      customerName={customerName}
    />
  );
}
