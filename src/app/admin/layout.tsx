"use client";

import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Realtime is provided per-page via RealtimeProvider to avoid duplicate listeners

  const { isAuthenticated, role, isLoading, hydrated } = useAuthStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading && hydrated) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role !== "admin") {
        router.push("/customer/bills");
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
