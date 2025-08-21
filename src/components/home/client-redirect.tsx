"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function ClientRedirect() {
  const router = useRouter();
  const { isAuthenticated, role, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;

    if (isAuthenticated) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/customer/bills");
      return;
    }

    const t = setTimeout(() => router.push("/login"), 5000);
    return () => clearTimeout(t);
  }, [hydrated, isAuthenticated, role, router]);

  // Render nothing to keep SSR/CSR markup identical
  return null;
}
