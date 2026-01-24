import { motion } from "framer-motion";
import { CustomerNavigation } from "@/components/ui/customer-navigation";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import LayoutCall from "@/components/customer/LayoutCall";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "customer") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-gray-950">
      <CustomerNavigation />
      <main className="pt-3 xl:ml-64 max-md:px-3 max-sm:px-1">
        <div className="py-1 sm:p-2 ">
          <LayoutCall>{children}</LayoutCall>
        </div>
      </main>
    </div>
  );
}
