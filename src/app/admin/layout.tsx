"use client";

import { Navigation } from "@/components/ui/navigation";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      <main className="pt-3 lg:pt-10 lg:ml-64 max-md:px-3">
        <div className="p-1 sm:p-2 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
