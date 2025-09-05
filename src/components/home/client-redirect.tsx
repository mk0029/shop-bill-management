"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function ClientRedirect() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/customer/bills");
    } else {
      router.replace("/login");
    }
    // Run on first mount and whenever auth state changes
  }, [isAuthenticated, role, router]);

  // Render nothing to keep SSR/CSR markup identical
  return null;
}
