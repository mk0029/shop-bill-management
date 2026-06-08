import SettingsBrowser from "@/components/settings/SettingsBrowser";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage() {
  const auth = await getServerAuth();

  return <SettingsBrowser basePath="/customer/settings" role="customer" customerUserId={auth.userId || null} />;
}
