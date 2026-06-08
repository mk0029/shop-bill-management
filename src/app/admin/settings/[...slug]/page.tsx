import SettingsBrowser from "@/components/settings/SettingsBrowser";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NestedSettingsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role === "customer") redirect("/customer/settings");
  const { slug = [] } = await params;
  return <SettingsBrowser slug={slug} basePath="/admin/settings" role={auth.role || "admin"} />;
}
