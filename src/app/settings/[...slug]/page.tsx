import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";

export default async function SettingsDeepLinkRedirectPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const auth = await getServerAuth();
  const { slug = [] } = await params;
  const path = slug.map(encodeURIComponent).join("/");
  if (auth.role === "customer") redirect(`/customer/settings${path ? `/${path}` : ""}`);
  redirect(`/admin/settings${path ? `/${path}` : ""}`);
}
