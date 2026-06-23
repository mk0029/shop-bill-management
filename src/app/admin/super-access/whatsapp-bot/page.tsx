import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import WhatsAppBotClient from "./client";

export const dynamic = "force-dynamic";

export default async function WhatsAppBotPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  return <WhatsAppBotClient />;
}
