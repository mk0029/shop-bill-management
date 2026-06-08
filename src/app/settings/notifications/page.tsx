import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";

export default async function LegacyNotificationsSettingsPage() {
  const auth = await getServerAuth();
  if (auth.role === "customer") redirect("/customer/settings/notifications");
  redirect("/admin/settings/notifications");
}
