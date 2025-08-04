"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import { Button } from "@/components/ui/button";
import { Home, FileText, User, LogOut, Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Home", href: "/customer/home", icon: Home },
  { name: "My Bills", href: "/customer/book", icon: FileText },
  { name: "Profile", href: "/customer/profile", icon: User },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, logout, isAuthenticated } = useAuthStore();
  const { t } = useLocaleStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || role !== "customer") {
      router.push("/login");
    }
  }, [isAuthenticated, role, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isAuthenticated || role !== "customer") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 lg:static lg:translate-x-0"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">Customer Portal</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || "C"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "Customer"}
                </p>
                <p className="text-xs text-gray-400 truncate">Customer</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("auth.logout")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                Welcome, {user?.name || "Customer"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
