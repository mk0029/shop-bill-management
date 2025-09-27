"use client";

import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { setCookie } from "@/lib/cookies";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, role, hydrated } = useAuthStore();
  const { t } = useLocaleStore();
  const [error, setError] = useState<string | null>(null);
  
  // Get phone and passKey from URL query parameters
  const phone = searchParams?.get('phone') || '';
  const passKey = searchParams?.get('passKey') || '';

  const handleLogin = async (credentials: {
    phone: string;
    secretKey: string;
    rememberMe?: boolean;
  }) => {
    try {
      setError(null);
      // Store remember preference so the auth store uses correct storage
      const remember = credentials.rememberMe ? "true" : "false";
      setCookie("auth-remember", remember, {
        days: credentials.rememberMe ? 30 : undefined,
        path: "/",
        sameSite: "Lax",
      });
      await login(credentials);

      // Redirect based on role
      const { role } = useAuthStore.getState();
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/customer/bills");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";

      // Check if it's a "user not found" error
      if (
        errorMessage.includes("Customer not found") ||
        errorMessage.includes("not found")
      ) {
        router.push("/customer-not-found");
        return;
      }

      setError(errorMessage);
    }
  };

  // If already authenticated (persisted), redirect user away from login
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      if (role === "admin") router.replace("/admin/dashboard");
      else router.replace("/customer/bills");
    }
  }, [hydrated, isAuthenticated, role, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <ClientOnly>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          {/* Language Selector
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <Dropdown
                options={languageOptions}
                value={language}
                onValueChange={handleLanguageChange}
                placeholder="Select Language"
                size="sm"
                className="w-32"
              />
            </div>
          </div> */}

          <Card className="p-8 bg-gray-900/80 backdrop-blur-sm border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-lg overflow-hidden bg-gray-800">
                <Image
                  src="/je-p-512.png"
                  alt="Jambh Electrics"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  priority
                />
              </motion.div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
                {t("app.title")}
              </h1>
              <p className="text-gray-400 text-lg">
                {t("auth.login")} to access your account
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Login Form */}
            <LoginForm
              onSubmit={handleLogin}
              isLoading={isLoading}
              error={error ?? undefined}
              initialValues={{
                phone: phone || undefined,
                secretKey: passKey || undefined,
              }}
            />
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p> 2025 Jambh Electrics</p>
            <p className="mt-1 text-xs">
              Professional Jambh Electrics system
            </p>
          </div>
        </motion.div>
      </ClientOnly>
    </div>
  );
}
