"use client";

import { useEffect, useRef, useState, useMemo } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronDown,
  FileText,
  History,
  Home,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  User,
  Building2,
  Users,
  X,
  DollarSign,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./button";
import { Dropdown } from "./dropdown";
import { useChatStore } from "@/store/chat-store";

import NotificationsPopover from "@/components/ui/notifications-popover";
import { canManageAdmins } from "@/lib/admin-utils";
import { useAuthStore } from "@/store/auth-store";
import Image from "next/image";
import { OnlineStatusToggle } from "@/components/online-status-toggle";
import RoomsOverlayList from "@/components/chat/RoomsOverlayList";
import NewChatLauncher from "@/components/chat/new-chat-launcher";
import { sanitizeUserText } from "@/constants/defaults";
import { FcmTokenButton } from "@/components/fcm/fcm-token-button";

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
    label: "Cash Book",
    href: "/admin/cash-book",
    icon: DollarSign,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    // children: [
    //   { label: "All Customers", href: "/admin/customers", icon: Users },
    //   { label: "Add Customer", href: "/admin/customers/add", icon: Plus },
    // ],
  },
  {
    label: "Bills",
    href: "/admin/billing",
    icon: FileText,
    // children: [
    //   { label: "All Bills", href: "/admin/billing", icon: FileText },
    //   // { label: "Create Bill", href: "/admin/billing/create?fresh=1", icon: Plus },
    //   { label: "Estimate Fitting Cost", href: "/admin/billing/fitting-wiring", icon: FileText },
    //   // { label: "Draft Bills", href: "/admin/billing/drafts", icon: FileText },
    // ],
  },

  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Package,
    // children: [
    //   { label: "All Items", href: "/admin/inventory", icon: Package },
    //   { label: "Add Item", href: "/admin/inventory/add", icon: Plus },
    // ],
  },
  {
    label: "Brand Management",
    href: "/admin/inventory/brands",
    icon: Building2,
    // children: [
    //   { label: "All Brands", href: "/admin/inventory/brands", icon: Building2 },
    //   { label: "Add Brand", href: "/admin/inventory/brands/add", icon: Plus },

    // ],
  },
  {
    label: "Rent Tools",
    href: "/admin/rent-tools",
    icon: Wrench,
  },
  {
    label: "Work List",
    href: "/dashboard/work-list",
    icon: FileText,
  },
  {
    label: "Other",
    href: "/admin/inventory",
    icon: Package,
    children: [
      { label: "Sales Report", href: "/admin/sales-report", icon: BarChart3 },
      {
        label: "Estimate Fitting Cost",
        href: "/admin/billing/fitting-wiring",
        icon: Settings,
      },
      {
        label: "Fitting Items List",
        href: "/admin/tools/fitting-items",
        icon: Settings,
      },
      {
        label: "Tools List Settings",
        href: "/admin/settings/toolslist",
        icon: Wrench,
      },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      {
        label: "Stock History",
        href: "/admin/inventory/history",
        icon: History,
      },
    ],
  },
  {
    label: "Chats",
    href: "/admin/chats",
    icon: Receipt,
  },
  {
    label: "Super Access",
    href: "/admin/super-access",
    icon: Shield,
    children: [
      {
        label: "Update Bills",
        href: "/admin/super-access/update-bills",
        icon: FileText,
      },
      {
        label: "Blacklist Customer",
        href: "/admin/super-access/blacklist-customer",
        icon: User,
      },
      {
        label: "Delete Cashbook Entry",
        href: "/admin/super-access/delete-cashbook-entry",
        icon: DollarSign,
      },
    ],
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
    label: "Chats",
    href: "/customer/chat",
    icon: Receipt,
  },
  {
    label: "Settings",
    href: "/customer/settings",
    icon: Settings,
  },
  {
    label: "Fitting Estimator",
    href: "/customer/fitting-estimator",
    icon: FileText,
  },
];
const technicianNavigation: NavigationItem[] = [
  {
    label: "Create Bill",
    href: "/admin/billing/create?fresh=1",
    icon: Plus,
  },
  {
    label: "Update Bills",
    href: "/admin/billing",
    icon: FileText,
  },
  {
    label: "Create Customer",
    href: "/admin/customers/add",
    icon: Users,
  },
  {
    label: "Cash Book",
    href: "/admin/cash-book",
    icon: DollarSign,
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Package,
  },
  {
    label: "Chats",
    href: "/admin/chats",
    icon: MessageSquare,
  },
  {
    label: "Work List",
    href: "/dashboard/work-list",
    icon: Wrench,
  },
];
export function Navigation() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoomsOverlayOpen, setIsRoomsOverlayOpen] = useState(false);
  const [showNewChatMobile, setShowNewChatMobile] = useState(false);
  // Allow only one expanded section at a time on mobile
  const [expandedItems, setExpandedItems] = useState<string | null>(null);
  const [isDesktopNavMinimized, setIsDesktopNavMinimized] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout, user } = useAuthStore();
  const {
    activeRoomId,
    setActiveRoom,
    clearActiveRoom,
    rooms,
    loadRooms,
    totalUnreadForAdmins,
  } = useChatStore();

  // Sanitize displayed text for non-admin users by removing content under specific characters

  // Compute a safe display name depending on role
  const rawDisplayName =
    user?.name ||
    user?.email?.split("@")[0] ||
    (role === "admin" || role === "super_admin" ? "Admin" : "User");
  const displayName =
    role === "admin" || role === "super_admin"
      ? rawDisplayName
      : sanitizeUserText(rawDisplayName) || "User";
  // Filter admin navigation based on permissions
  const getFilteredAdminNavigation = () => {
    const userEmail = (user as any)?.email;
    const showAdminManagement = canManageAdmins(userEmail);

    const isSuperAdmin = role === "super_admin";

    return adminNavigation.filter((item) => {
      if (item.href === "/admin/manage-admins") {
        return showAdminManagement;
      }
      if (item.href === "/admin/super-access") {
        return isSuperAdmin;
      }
      return true;
    });
  };

  const navigation =
    role === "admin" || role === "super_admin"
      ? getFilteredAdminNavigation()
      : role === "technician"
        ? technicianNavigation
        : customerNavigation;

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => (prev === label ? null : label));
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    // Normalize by stripping query params from href to compare pathnames only
    const hrefPath = href.split("?")[0];
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  };
  const isChatScreen =
    isActive("/admin/chats") || isActive("/customer/chat") || isActive("/chat");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("admin_nav_minimized");
    const minimized = saved === "1";
    setIsDesktopNavMinimized(minimized);
    document.documentElement.style.setProperty(
      "--admin-nav-w",
      minimized ? "5rem" : "16rem",
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "admin_nav_minimized",
      isDesktopNavMinimized ? "1" : "0",
    );
    document.documentElement.style.setProperty(
      "--admin-nav-w",
      isDesktopNavMinimized ? "5rem" : "16rem",
    );
  }, [isDesktopNavMinimized]);

  const handleLogout = () => {
    logout();
    router.replace("/");
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

  // Load chat rooms for admin users to show unread message indicator on all pages
  useEffect(() => {
    if ((role === "admin" || role === "super_admin" || role === "technician") && user) {
      // Load rooms in background for unread message indicator
      loadRooms().catch(() => {
        // Silently fail - rooms will be loaded when user visits chat page
      });
    }
  }, [role, user]); // Remove loadRooms from dependencies to prevent infinite loop

  // Auto-open Rooms overlay on mobile when on Chats and no room selected
  useEffect(() => {
    // Determine if we are on chats without relying on isActive (to avoid lint dep)
    const onChats =
      typeof pathname === "string"
        ? pathname.split("?")[0].startsWith("/admin/chats")
        : false;
    // basic mobile check
    const isMobile =
      typeof window !== "undefined" ? window.innerWidth < 768 : false;
    if ((role === "admin" || role === "super_admin" || role === "technician") && onChats && isMobile) {
      if (!activeRoomId) {
        setIsRoomsOverlayOpen(true);
      }
    }
  }, [role, activeRoomId, pathname]);

  // Calculate unread messages count for the orange dot indicator
  const unreadMessagesCount = totalUnreadForAdmins;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR/client HTML mismatch from persisted auth/nav state.
  if (!mounted) {
    return null;
  }

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
              className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base relative ${
                active
                  ? "bg-slate-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {/* Orange dot indicator for new messages in Chats */}
              {item.label === "Chats" && unreadMessagesCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              )}
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
      if (isDesktopNavMinimized) {
        return (
          <div key={item.label}>
            <Link
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                active ? "bg-gray-500 text-white" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          </div>
        );
      }
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
              (
                globalThis as { __routeProgressStart?: () => void }
              ).__routeProgressStart?.();
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
      <div key={item.label}>
        <Link
          href={item.href}
          title={isDesktopNavMinimized ? item.label : undefined}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors relative ${
            active
              ? "bg-gray-500 text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Icon className="w-5 h-5" />
          {!isDesktopNavMinimized && (
            <span className="font-medium">{item.label}</span>
          )}
          {/* Orange dot indicator for new messages in Chats */}
          {item.label === "Chats" && unreadMessagesCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
          )}
        </Link>
      </div>
    );
  };

  return (
    <>
      {/* Fixed Mobile Menu Launcher */}
      {!isMobileMenuOpen && !isRoomsOverlayOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const onAdminChats =
              typeof pathname === "string"
                ? pathname.split("?")[0].startsWith("/admin/chats")
                : false;
            const isMobile =
              typeof window !== "undefined" ? window.innerWidth < 768 : false;

            if (onAdminChats && isMobile && activeRoomId) {
              clearActiveRoom();
              return;
            }
            setIsMobileMenuOpen(true);
          }}
          className="xl:hidden fixed left-2 z-[70] rounded-xl bg-gray-900/95 border border-gray-700 text-gray-200 shadow-lg backdrop-blur px-2.5 py-2"
          style={{ top: "max(0.65rem, env(safe-area-inset-top))" }}
          title={
            typeof pathname === "string" &&
            pathname.split("?")[0].startsWith("/admin/chats") &&
            !!activeRoomId
              ? "Back to chat list"
              : "Open menu"
          }
        >
          {typeof pathname === "string" &&
          pathname.split("?")[0].startsWith("/admin/chats") &&
          !!activeRoomId ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
          {(role === "admin" || role === "super_admin" || role === "technician") &&
            unreadMessagesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            )}
        </Button>
      )}

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
              className="fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-[60] xl:hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-800">
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
                  {role === "super_admin"
                    ? "Super Admin"
                    : role === "admin"
                      ? "Administrator"
                      : role === "technician"
                        ? "Technician"
                        : "User"}
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
      <nav
        className={`hidden xl:block bg-gray-900 border-r border-gray-800 h-screen fixed z-50 left-0 top-0 overflow-y-auto transition-all duration-200 ${
          isDesktopNavMinimized ? "w-20" : "w-64"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className={`flex items-center ${isDesktopNavMinimized ? "justify-center" : "gap-3"}`}>
            <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-600 p-1.5">
              <Image
                src="/je-p-48.png"
                alt="Logo"
                width={40}
                height={40}
                sizes="40px"
                quality={100}
                className="h-full w-full object-contain"
              />
            </div>
            {!isDesktopNavMinimized && (
              <>
                <div>
                  <h1 className="text-lg font-bold text-white">Jambh Electrics</h1>
                  <p className="text-gray-400 text-sm">
                    {role === "admin" || role === "super_admin"
                      ? "Admin Panel"
                      : "Customer Portal"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDesktopNavMinimized((v) => !v)}
                  className="ml-auto rounded-md p-1.5 text-gray-300 hover:bg-gray-800"
                  title="Minimize sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {isDesktopNavMinimized && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setIsDesktopNavMinimized(false)}
                className="rounded-md p-1.5 text-gray-300 hover:bg-gray-800"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          )}
          </div>

        {/* Navigation Items */}
        <div className="sm:p-4 p-3 space-y-2 pb-28">
          {navigation.map((item) => renderNavigationItem(item))}
          {/* Online Status Toggle for Desktop */}
          {!isDesktopNavMinimized && <div className="pt-2">
            <OnlineStatusToggle />
          </div>}
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            {!isDesktopNavMinimized && <div>
              <p className="text-white font-medium">{displayName}</p>
              <p className="text-gray-400 text-sm">
                {role === "super_admin"
                  ? "Super Admin"
                  : role === "admin"
                    ? "Administrator"
                    : role === "technician"
                      ? "Technician"
                      : "User"}
              </p>
            </div>}
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full" title="Logout">
            <LogOut className="w-4 h-4 mr-2" />
            {!isDesktopNavMinimized && "Logout"}
          </Button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      {!isChatScreen && <div className="h-[62px]"></div>}
      {!isChatScreen && (
      <div className="min-h-fit backdrop-blur-lg fixed z-40 top-0 w-full left-0" style={{ paddingLeft: "var(--admin-nav-w, 16rem)" }}>
        {/* Top Bar */}
        <div
          className={`border-b border-gray-800 py-2.5 px-4 sm:p-4 xl:p-6 ${isActive("/admin/chats") && "md:!py-0"}`}
        >
          <div className="flex items-center justify-between">
            <h1
              className={`text-xl sm:text-2xl font-bold !leading-[125%] text-white ${isActive("/admin/chats") && "md:hidden"}`}
            >
              {navigation.find((item) => isActive(item.href))?.label ||
                "Dashboard"}
            </h1>
            <div className="flex items-center gap-x-3">
              <NotificationsPopover />
              {/* Mobile: open Rooms overlay when on any page for admin users */}
              {(role === "admin" || role === "super_admin" || role === "technician") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRoomsOverlayOpen(true)}
                  className=" xl:hidden bg-gray-900 border border-gray-700 max-sm:!py-2 relative"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full"></span>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className=" xl:hidden bg-gray-900 border border-gray-700 max-sm:!py-2 relative"
              >
                <Menu className="w-5 h-5" />
                {/* Orange dot indicator for new messages on hamburger menu */}
                {(role === "admin" || role === "super_admin" || role === "technician") &&
                  unreadMessagesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  )}
              </Button>
            </div>
          </div>
          {/* Chats quick room selector in top bar when on Chats page (admin) */}
        </div>
      </div>
      )}
      {/* Mobile Rooms Overlay (slides in from left) */}
      <AnimatePresence>
        {isRoomsOverlayOpen && (role === "admin" || role === "super_admin" || role === "technician") && (
          <>
            {/* Full-screen chats screen on mobile (WhatsApp-style) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 h-full w-full max-w-none bg-gray-900 z-[50] md:hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">Chats</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChatMobile(true)}
                    className="hover:bg-gray-800 text-white"
                    title="Start new chat"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMobileMenuOpen(true);
                    }}
                    className="hover:bg-gray-800 text-white"
                    title="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              {/* Content: vertical rooms list like WhatsApp */}
              <div className="p-0 sm:p-0 overflow-y-auto flex-1">
                <RoomsOverlayList
                  activeRoomId={activeRoomId || undefined}
                  onSelect={(rid) => {
                    void setActiveRoom(rid, "admin");
                    setIsRoomsOverlayOpen(false);
                    // No URL navigation needed - WhatsApp style state-based routing
                  }}
                  adminId={
                    (user as { id?: string; _id?: string } | null)?.id ||
                    (user as { id?: string; _id?: string } | null)?._id
                  }
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Chat Launcher for Mobile */}
      {showNewChatMobile && (
        <NewChatLauncher
          onClose={() => setShowNewChatMobile(false)}
          onRoomOpen={(roomId) => {
            setShowNewChatMobile(false);
            void setActiveRoom(roomId, "admin");
            setIsRoomsOverlayOpen(false);
            // No URL navigation needed - WhatsApp style state-based routing
          }}
        />
      )}
    </>
  );
}
