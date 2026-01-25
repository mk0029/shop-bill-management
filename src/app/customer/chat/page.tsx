import CustomerChatClient from "@/components/customer/customer-chat-client";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerChatPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  const customerId = auth.userId;
  if (!customerId) redirect("/");

  const customerName = (auth.user?.name as string) || "Customer";

  return (
    <CustomerChatClient customerId={customerId} customerName={customerName} />
  );
}
