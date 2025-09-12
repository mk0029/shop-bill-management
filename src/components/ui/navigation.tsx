"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  FileText,
  History,
  Home,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  Settings,
  Shield,
  User,
  Building2,
  Users,
  X,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./button";
import { Dropdown } from "./dropdown";

import NotificationsPopover from "@/components/ui/notifications-popover";
import { canManageAdmins } from "@/lib/admin-utils";
import { useAuthStore } from "@/store/auth-store";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { OnlineStatusToggle } from "@/components/online-status-toggle";

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
    label: "Settings",
    href: "/customer/settings",
    icon: Settings,
  },
];
export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Allow only one expanded section at a time on mobile
  const [expandedItems, setExpandedItems] = useState<string | null>(null);
  const prevOverflowRef = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout, user } = useAuthStore();
  
  const { user: clerkUser } = useUser();
  // Sanitize displayed text for non-admin users by removing content under specific characters
  const sanitizeUserText = (text: string): string => {
    try {
      let s = text ?? "";
      // Remove content within (), {}, []
      s = s.replace(/\(.*?\)/g, "");
      s = s.replace(/\{.*?\}/g, "");
      s = s.replace(/\[.*?\]/g, "");
      // Remove content within single and double quotes
      s = s.replace(/"[^"]*"/g, "");
      s = s.replace(/'[^']*'/g, "");
      // Remove markdown italic/bold segments
      s = s.replace(/\*\*.*?\*\*/g, "");
      s = s.replace(/\*.*?\*/g, "");
      // Collapse extra whitespace
      s = s.replace(/\s{2,}/g, " ").trim();
      return s;
    } catch {
      return "";
    }
  };

  // Compute a safe display name depending on role
  const rawDisplayName = user?.name || user?.email?.split('@')[0] || (role === "admin" ? "Admin" : "User");
  const displayName = role === "admin" ? rawDisplayName : (sanitizeUserText(rawDisplayName) || "User");
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
    setExpandedItems((prev) => (prev === label ? null : label));
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    // Normalize by stripping query params from href to compare pathnames only
    const hrefPath = href.split("?")[0];
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  };

  const handleLogout = () => {
    logout();
  };

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    const body = document.body;
    if (isMobileMenuOpen) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
    }
    return () => {
      body.style.overflow = prevOverflowRef.current ?? "";
    };
  }, [isMobileMenuOpen]);

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems === item.label;
    const active = isActive(item.href);

    if (isMobile) {
      return (
        <div key={item.label} className="space-y-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(item.label)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base transition-colors ${
                active
                  ? "bg-slate-600 text-white"
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
              className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base ${
                active
                  ? "bg-slate-600 text-white"
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
            <div className="ml-3 space-y-1">
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
                        ? "bg-slate-600/70 text-white"
                        : "text-gray-400 bg-slate-600/20 hover:text-gray-300"
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
        dropLeft
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
            // Trigger global route progress if available
            try {
              (globalThis as { __routeProgressStart?: () => void }).__routeProgressStart?.();
            } catch {}
            // Use client-side navigation for faster route switching
            router.push(value);
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
          active ? "bg-gray-500 text-white" : "text-gray-300 hover:bg-gray-800"
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

            {/* Mobile Menu */
            }
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-[60] xl:hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="sm:p-4 p-3 space-y-2 flex-1 overflow-auto flex flex-col grow">
                {navigation.map((item) => renderNavigationItem(item, true))}
                {/* Online Status Toggle for Mobile */}
                <div className="pt-2 px-4">
                  <OnlineStatusToggle />
                </div>
              </div>

              {/* User Section */}
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{displayName}</p>
                    <p className="text-gray-400 text-sm">
                      {role === "admin" ? "Administrator" : "User"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Navigation */}
      <nav className="hidden xl:block w-64 bg-gray-900 border-r border-gray-800 h-screen fixed z-50 left-0 top-0 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Image src="/je-p-48.png" alt="Logo" width={40} height={40} sizes="100vw" quality={100}/>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Jambh Electrics</h1>
              <p className="text-gray-400 text-sm">
                {role === "admin" ? "Admin Panel" : "Customer Portal"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="sm:p-4 p-3 space-y-2 pb-28">
          {navigation.map((item) => renderNavigationItem(item))}
          {/* Online Status Toggle for Desktop */}
          <div className="pt-2">
            <OnlineStatusToggle />
          </div>
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
            <p className="text-white font-medium">{displayName}</p>
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
      <div className="h-[65px]"></div>
      <div className="xl:!pl-64 min-h-fit backdrop-blur-lg fixed z-40 top-0 w-full left-0">
        {/* Top Bar */}
        <div className="border-b border-gray-800 py-2.5 px-4 sm:p-4 xl:p-6">
          <div className="flex items-center justify-between">
           
              <h1 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {navigation.find((item) => isActive(item.href))?.label ||
                  "Dashboard"}
              </h1>
           
            
           

              
            
           
            <div className="flex items-center gap-x-3">
             <NotificationsPopover />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className=" xl:hidden bg-gray-900 border border-gray-700 max-sm:!py-2">
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
