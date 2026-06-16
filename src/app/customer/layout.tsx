import { motion } from "framer-motion";
import { CustomerNavigation } from "@/components/ui/customer-navigation";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import LayoutCall from "@/components/customer/LayoutCall";
import CustomerMainShell from "@/components/customer/CustomerMainShell";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  return (
    <div className="h-[var(--app-vh,100dvh)] overflow-hidden bg-gray-950 [--customer-topbar-h:57px] xl:[--customer-topbar-h:89px]">
      <CustomerNavigation />
      <CustomerMainShell>
        <LayoutCall>{children}</LayoutCall>
      </CustomerMainShell>
    </div>
  );
}
