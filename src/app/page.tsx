"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && role) {
      // Redirect based on role
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/customer/home");
      }
    } else {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [isAuthenticated, role, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 shadow-xl">
        <CardContent className="p-6">
          <div className="text-gray-100 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-100 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Redirecting...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
