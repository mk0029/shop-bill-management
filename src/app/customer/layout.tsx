"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { CustomerNavigation } from "@/components/ui/customer-navigation";
import NotificationSyncGate from "@/components/system/notification-sync-gate";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, hydrated } = useAuthStore();

  // Note: We intentionally avoid real-time listeners on customer pages
  // to prevent subscribing to global bill streams. Bills are fetched via
  // a server API filtered by the authenticated customer.
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading && hydrated) {
      if (!isAuthenticated) {
        router.push("/");
      } else if (role !== "customer") {
        router.push("/admin/dashboard");
      }
    }
  }, [isAuthenticated, role, router, isClient, isLoading, hydrated]);

  // Note: We no longer redirect to '/offline'. Offline mode is handled inline by components.

  // Show loading only until we are on client and not actively loading
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // After hydration, if not authenticated or wrong role, block and let effect redirect
  if (hydrated && (!isAuthenticated || role !== "customer")) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <NotificationSyncGate />
      <CustomerNavigation />
      <main className="pt-3 xl:ml-64 max-md:px-3 max-sm:px-1">
        <div className="py-1 sm:p-2 ">
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
