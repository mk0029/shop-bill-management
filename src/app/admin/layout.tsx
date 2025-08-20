"use client";

import { Navigation } from "@/components/ui/navigation";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useNetworkMonitor } from "@/hooks/use-network-monitor";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable global real-time sanity sync for all admin pages
  useRealtimeSync();

  const { isAuthenticated, role, isLoading } = useAuthStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { online } = useNetworkMonitor({ intervalMs: 5000, failThreshold: 2, successThreshold: 3 });
  const lastRedirectAtRef = useRef<number>(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role !== "admin") {
        router.push("/customer/home");
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
  if (!isAuthenticated || role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <main className="pt-3 xl:pt-10 xl:ml-64 max-md:px-3">
        <div className="p-1 sm:p-2 xl:p-6">{children}</div>
      </main>
    </div>
  );
}
