import HomeLanding from "@landing/components/home/HomeLanding";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  await getServerAuth();

  return <HomeLanding />;
}
