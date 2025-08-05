"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./button";
import {
  Menu,
  X,
  FileText,
  User,
  LogOut,
  MessageSquare,
  Wrench,
  Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  isDisabled?: boolean;
}

const customerNavigation: NavigationItem[] = [
  {
    label: "All Bills",
    href: "/customer/bills",
    icon: FileText,
  },
  {
    label: "Pending Bills",
    href: "/customer/bills/history?status=pending",
    icon: FileText,
  },
  {
    label: "Paid Bills",
    href: "/customer/bills/history?status=paid",
    icon: FileText,
  },
  {
    label: "Profile",
    href: "/customer/profile",
    icon: User,
  },
  {
    label: "Chat",
    icon: MessageSquare,
    isDisabled: true,
  },
  {
    label: "Request Repair",
    icon: Wrench,
    isDisabled: true,
  },
];

export function CustomerNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { role, logout, isAuthenticated, user } = useAuthStore();

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = () => {
    logout();
  };

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isDisabled = item.isDisabled;

    if (isMobile) {
      if (isDisabled) {
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 cursor-default"
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </div>
        );
      }

      return (
        <Link
          key={item.label}
          href={item.href!}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            active
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      );
    }

    // Desktop rendering
    if (isDisabled) {
      return (
        <div
          key={item.label}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 cursor-default"
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-gray-900 border border-gray-700"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-50 lg:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Customer Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-2">
                {customerNavigation.map((item) => renderNavigationItem(item, true))}
              </div>

              {/* User Section */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {user?.name || "Customer"}
                    </p>
                    <p className="text-gray-400 text-sm">Customer</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block w-64 bg-gray-900 border-r border-gray-800 h-screen fixed left-0 top-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Customer Portal</h1>
              <p className="text-gray-400 text-sm">Manage your bills</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          {customerNavigation.map((item) => renderNavigationItem(item))}
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                {user?.name || "Customer"}
              </p>
              <p className="text-gray-400 text-sm">Customer</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="lg:ml-64 min-h-fit bg-gray-950">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {customerNavigation.find((item) => isActive(item.href))?.label ||
                  "Customer Portal"}
              </h1>
              <p className="text-gray-400">Manage your bills and services</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                Welcome, {user?.name || "Customer"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 