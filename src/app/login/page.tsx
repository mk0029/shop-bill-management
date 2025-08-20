"use client";

import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import { motion } from "framer-motion";
import { Globe, Info, Zap } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useRouter } from "next/navigation";
import { useState } from "react";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "ur", label: "اردو" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { language, setLanguage, t } = useLocaleStore();
  const [error, setError] = useState<string | null>(null);
  const [setCopiedCredential] = useState<string | null>(null);

  const handleLogin = async (credentials: {
    phone: string;
    secretKey: string;
    rememberMe?: boolean;
  }) => {
    try {
      setError(null);
      // Store remember preference so the auth store uses correct storage
      if (typeof window !== "undefined") {
        const remember = credentials.rememberMe ? "true" : "false";
        window.localStorage.setItem("auth-remember", remember);
      }
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

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as "en" | "hi" | "ur");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <ClientOnly>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          {/* Language Selector */}
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
          </div>

          <Card className="p-8 bg-gray-900/80 backdrop-blur-sm border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mb-6 shadow-lg">
                <Zap className="w-10 h-10 text-white" />
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
              error={error || undefined}
            />
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>© 2025 Electrician Shop Management System</p>
            <p className="mt-1 text-xs">
              Professional electrician shop management solution
            </p>
          </div>
        </motion.div>
      </ClientOnly>
    </div>
  );
}
