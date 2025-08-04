"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LoginForm } from "@/components/forms/login-form";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Zap, Globe, Copy, CheckCircle, Info } from "lucide-react";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "ur", label: "اردو" },
];

const demoCredentials = {
  admin: { id: "admin", key: "admin123" },
  customer: { id: "customer1", key: "secret123" },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { language, setLanguage, t } = useLocaleStore();
  const [error, setError] = useState<string | null>(null);
  const [copiedCredential, setCopiedCredential] = useState<string | null>(null);

  const handleLogin = async (credentials: {
    customerId: string;
    secretKey: string;
  }) => {
    try {
      setError(null);
      await login(credentials);

      // Redirect based on role
      const { role } = useAuthStore.getState();
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/customer/home");
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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCredential(type);
      setTimeout(() => setCopiedCredential(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
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
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mb-6 shadow-lg"
            >
              <Zap className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-3">
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
              className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6"
            >
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

          {/* Debug Test Buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleLogin({ customerId: "admin", secretKey: "admin123" })
              }
              className="text-xs"
            >
              Test Admin Login
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleLogin({ customerId: "customer1", secretKey: "secret123" })
              }
              className="text-xs"
            >
              Test Customer Login
            </Button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-gray-300">
                Demo Credentials
              </p>
            </div>

            <div className="space-y-3">
              {/* Admin Credentials */}
              <div className="p-3 bg-gray-900 rounded border border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Admin Access</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-2 py-1 rounded text-xs text-white">
                        {demoCredentials.admin.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(demoCredentials.admin.id, "adminId")
                        }
                        className="h-6 w-6 p-0 hover:bg-gray-700"
                      >
                        {copiedCredential === "adminId" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Key:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-2 py-1 rounded text-xs text-white">
                        {demoCredentials.admin.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(demoCredentials.admin.key, "adminKey")
                        }
                        className="h-6 w-6 p-0 hover:bg-gray-700"
                      >
                        {copiedCredential === "adminKey" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Credentials */}
              <div className="p-3 bg-gray-900 rounded border border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Customer Access</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-2 py-1 rounded text-xs text-white">
                        {demoCredentials.customer.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            demoCredentials.customer.id,
                            "customerId"
                          )
                        }
                        className="h-6 w-6 p-0 hover:bg-gray-700"
                      >
                        {copiedCredential === "customerId" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Key:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-2 py-1 rounded text-xs text-white">
                        {demoCredentials.customer.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            demoCredentials.customer.key,
                            "customerKey"
                          )
                        }
                        className="h-6 w-6 p-0 hover:bg-gray-700"
                      >
                        {copiedCredential === "customerKey" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Electrician Shop Management System</p>
          <p className="mt-1 text-xs">
            Professional electrician shop management solution
          </p>
        </div>
      </motion.div>
    </div>
  );
}
