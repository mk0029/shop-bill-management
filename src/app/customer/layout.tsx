"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { useNetworkMonitor } from "@/hooks/use-network-monitor";
import { CustomerNavigation } from "@/components/ui/customer-navigation";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuthStore();
  const { online } = useNetworkMonitor({ intervalMs: 5000, failThreshold: 2, successThreshold: 3 });
  const lastRedirectAtRef = useRef<number>(0);

  // Note: We intentionally avoid real-time listeners on customer pages
  // to prevent subscribing to global bill streams. Bills are fetched via
  // a server API filtered by the authenticated customer.
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

  // Offline redirection
  useEffect(() => {
    if (!isClient) return;
    const isOnOffline = window.location.pathname === "/offline";
    if (!online && !isOnOffline) {
      const now = Date.now();
      if (now - lastRedirectAtRef.current < 5000) return; // debounce redirects
      lastRedirectAtRef.current = now;
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/offline?from=${from}`);
    }
  }, [online, router, isClient]);

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
      <main className="pt-3 xl:pt-10 xl:ml-64 max-md:px-3">
        <div className="p-1 sm:p-2 xl:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
