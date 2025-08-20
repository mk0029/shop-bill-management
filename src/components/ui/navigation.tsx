"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./button";
import { Dropdown } from "./dropdown";
import {
  Menu,
  X,
  Home,
  Users,
  FileText,
  Settings,
  BarChart3,
  CreditCard,
  User,
  LogOut,
  ChevronDown,
  Plus,
  History,
  Receipt,
  Building2,
  Bell,
  Package,
  Shield,
  UserCog,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { SidebarNetworkStatus } from "./sidebar-network-status";
import { canManageAdmins } from "@/lib/admin-utils";
import { useUser } from "@clerk/nextjs";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

const adminNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: Home,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    children: [
      { label: "All Customers", href: "/admin/customers", icon: Users },
      { label: "Add Customer", href: "/admin/customers/add", icon: Plus },
    ],
  },
  {
    label: "Billing",
    href: "/admin/billing",
    icon: FileText,
    children: [
      { label: "All Bills", href: "/admin/billing", icon: FileText },
      { label: "Create Bill", href: "/admin/billing/create?fresh=1", icon: Plus },
      { label: "Draft Bills", href: "/admin/billing/drafts", icon: FileText },
    ],
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Package,
    children: [
      { label: "All Items", href: "/admin/inventory", icon: Package },
      { label: "Add Item", href: "/admin/inventory/add", icon: Plus },
      {
        label: "Brand Management",
        href: "/admin/inventory/brands",
        icon: Building2,
      },
      {
        label: "Stock History",
        href: "/admin/inventory/history",
        icon: History,
      },
    ],
  },
  {
    label: "Sales Report",
    href: "/admin/sales-report",
    icon: BarChart3,
  },
  {
    label: "Admin Management",
    href: "/admin/manage-admins",
    icon: Shield,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

const customerNavigation: NavigationItem[] = [
  {
    label: "Home",
    href: "/customer/bills",
    icon: Home,
  },
  {
    label: "My Bills",
    href: "/customer/bills",
    icon: Receipt,
  },
  {
    label: "Profile",
    href: "/customer/profile",
    icon: User,
  },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const { role, logout, isAuthenticated, user } = useAuthStore();
  const { user: clerkUser } = useUser();

  // Filter admin navigation based on permissions
  const getFilteredAdminNavigation = () => {
    const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
    const showAdminManagement = canManageAdmins(userEmail);

    return adminNavigation.filter((item) => {
      if (item.href === "/admin/manage-admins") {
        return showAdminManagement;
      }
      return true;
    });
  };

  const navigation =
    role === "admin" ? getFilteredAdminNavigation() : customerNavigation;

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    // Normalize by stripping query params from href to compare pathnames only
    const hrefPath = href.split("?")[0];
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  };

  const handleLogout = () => {
    logout();
  };

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.href);

    if (isMobile) {
      return (
        <div key={item.label} className="space-y-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(item.label)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          )}

          {hasChildren && isExpanded && (
            <div className="ml-6 space-y-1">
              {item.children!.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.href);
                return (
                  <Link
                    key={child.label}
                    href={child.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      childActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                    }`}
                  >
                    <ChildIcon className="w-4 h-4" />
                    <span className="text-sm">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Desktop rendering
    if (hasChildren) {
      // Determine active child so only the selected item is highlighted
      const activeChild = item.children!.find((child) => isActive(child.href));
      return (
        <Dropdown
          searchable={false}
          key={item.label}
          options={item.children!.map((child) => ({
            value: child.href,
            label: child.label,
          }))}
          value={activeChild ? activeChild.href : active ? item.href : ""}
          onValueChange={(value) => {
            // Handle navigation
            try {
              if (value.startsWith("/admin/billing/create")) {
                localStorage.setItem("bill_create_skip_restore", "1");
              }
            } catch {}
            window.location.href = value;
          }}
          placeholder={item.label}
          className="w-full"
        />
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
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

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 xl:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-50 xl:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Menu</h2>
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
              <div className="sm:p-4 p-3 space-y-2">
                <SidebarNetworkStatus />
                {navigation.map((item) => renderNavigationItem(item, true))}
              </div>

              {/* User Section */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {role === "admin" ? "Admin" : "Customer"}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {role === "admin" ? "Administrator" : "User"}
                    </p>
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
      <nav className="hidden xl:block w-64 bg-gray-900 border-r border-gray-800 h-screen fixed left-0 top-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Shop Manager</h1>
              <p className="text-gray-400 text-sm">
                {role === "admin" ? "Admin Panel" : "Customer Portal"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="sm:p-4 p-3 space-y-2">
          <SidebarNetworkStatus />
          {navigation.map((item) => renderNavigationItem(item))}
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">
                {role === "admin" ? "Admin" : "Customer"}
              </p>
              <p className="text-gray-400 text-sm">
                {role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="xl:ml-64 min-h-fit bg-gray-950">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 p-4 xl:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {navigation.find((item) => isActive(item.href))?.label ||
                  "Dashboard"}
              </h1>
              <p className="text-gray-400">
                {role === "admin" ? "Admin Panel" : "Customer Portal"}
              </p>
            </div>
            <div className="flex items-center gap-x-3">
              {" "}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0.5 sm:-top-1 right-0.5 sm:-right-1 h-2 w-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="xl:hidden bg-gray-900 border border-gray-700"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
