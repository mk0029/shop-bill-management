"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { CustomerNavigation } from "@/components/ui/customer-navigation";
import { useCustomerBillSync } from "@/hooks/use-realtime-sync";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuthStore();

  // Enable real-time bill sync for this customer
  useCustomerBillSync(user?.id);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role !== "customer") {
        router.push("/admin/dashboard");
      }
    }
  }, [isAuthenticated, role, router, isClient, isLoading]);

  // Show loading while checking authentication
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated or wrong role
  if (!isAuthenticated || role !== "customer") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <CustomerNavigation />
      <main className="pt-16 lg:pt-24 lg:ml-64">
        <div className="p-3 sm:p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
