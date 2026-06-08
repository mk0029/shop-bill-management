import SettingsBrowser from "@/components/settings/SettingsBrowser";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function CustomerNestedSettingsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const auth = await getServerAuth();
  const { slug = [] } = await params;

  return (
    <SettingsBrowser
      slug={slug}
      basePath="/customer/settings"
      role="customer"
      customerUserId={auth.userId || null}
    />
  );
}
