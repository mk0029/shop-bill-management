"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function ClientRedirect({
  redirectUnauthenticated = true,
}: {
  redirectUnauthenticated?: boolean;
}) {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/customer/bills");
    } else if (redirectUnauthenticated) {
      router.replace("/login");
    }
    // Run on first mount and whenever auth state changes
  }, [isAuthenticated, role, router, redirectUnauthenticated]);

  // Render nothing to keep SSR/CSR markup identical
  return null;
}
