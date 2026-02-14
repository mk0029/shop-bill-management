import HomeLanding from "../components/home/HomeLanding";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const auth = await getServerAuth();
  if (auth.isAuthenticated) {
    if (auth.role === "customer") redirect("/customer/bills");
    if (auth.role === "admin" || auth.role === "super_admin")
      redirect("/admin/dashboard");
  }

  return <HomeLanding />;
}
