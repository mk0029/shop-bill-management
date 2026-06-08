import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";

export default async function SettingsRedirectPage() {
  const auth = await getServerAuth();
  if (auth.role === "customer") redirect("/customer/settings");
  redirect("/admin/settings");
}
