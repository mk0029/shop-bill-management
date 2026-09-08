"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import History from "lucide-react/dist/esm/icons/history.js";
import Home from "lucide-react/dist/esm/icons/home.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import HomeIcon from "lucide-react/dist/esm/icons/home.js";
import Menu from "lucide-react/dist/esm/icons/menu.js";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle.js";
import Megaphone from "lucide-react/dist/esm/icons/megaphone.js";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical.js";
import Package from "lucide-react/dist/esm/icons/package.js";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close.js";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import Shield from "lucide-react/dist/esm/icons/shield.js";
import Smartphone from "lucide-react/dist/esm/icons/smartphone.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import Wrench from "lucide-react/dist/esm/icons/wrench.js";
import X from "lucide-react/dist/esm/icons/x.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3.js";
import Tag from "lucide-react/dist/esm/icons/tag.js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./button";
import { Dropdown } from "./dropdown";
import NotificationsPopover from "@/components/ui/notifications-popover";
import { canManageAdmins } from "@/lib/admin-utils";
import { useAuthStore } from "@/store/auth-store";
import Image from "next/image";
import { OnlineStatusToggle } from "@/components/online-status-toggle";
import InstallButton from "@/components/pwa/install-button";
import { safeUserName } from "@/lib/display-text";
import { useGlobalShopChat } from "@/lib/shop-chat/use-global-chat";
import { SanityImage } from "./sanity-image";
import { sanityClient } from "@/lib/sanity";
import { createPortal } from "react-dom";
import { useRegistrationRequestStore } from "@/store/registration-request-store";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

const adminNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Home },
  { label: "Cash Book", href: "/admin/cash-book", icon: DollarSign },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Chat", href: "/admin/chat", icon: MessageCircle },
  { label: "Bills", href: "/admin/billing", icon: FileText },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  {
    label: "Brand Management",
    href: "/admin/inventory/brands",
    icon: Package,
  },
  { label: "Rent Tools", href: "/admin/rent-tools", icon: Wrench },
  { label: "Offers", href: "/admin/offers", icon: Tag },
  { label: "Work List", href: "/dashboard/work-list", icon: FileText },
  {
    label: "Other",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      {
        label: "Send Notifications",
        href: "/admin/notifications",
        icon: Megaphone,
      },
    ],
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
      {
        label: "Testing Ground",
        href: "/admin/super-access/testing-ground",
        icon: RefreshCw,
      },
    ],
  },
];

const customerNavigation: NavigationItem[] = [
  { label: "Home", href: "/customer/bills", icon: Home },
  { label: "My Bills", href: "/customer/bills", icon: FileText },
  { label: "Settings", href: "/customer/settings", icon: Settings },
  {
    label: "Fitting Estimator",
    href: "/customer/fitting-estimator",
    icon: FileText,
  },
];

const technicianNavigation: NavigationItem[] = [
  { label: "Create Bill", href: "/admin/billing/create?fresh=1", icon: Plus },
  { label: "Update Bills", href: "/admin/billing", icon: FileText },
  { label: "Create Customer", href: "/admin/customers/add", icon: Users },
  { label: "Chat", href: "/admin/chat", icon: MessageCircle },
  { label: "Cash Book", href: "/admin/cash-book", icon: DollarSign },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Work List", href: "/dashboard/work-list", icon: Wrench },
];

export function Navigation() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string | null>(null);
  const [isDesktopNavMinimized, setIsDesktopNavMinimized] = useState(false);
  const [isChatRoomOpen, setIsChatRoomOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout, user } = useAuthStore();
  const { hasUnread: hasChatUnread } = useGlobalShopChat(user as any);
  const [repairAttentionCount, setRepairAttentionCount] = useState(0);
  const pendingRequestsCount = useRegistrationRequestStore((s) => s.pendingCount);
  const isChatRoute = pathname === "/admin/chat";
  const isRepairRoute =
    pathname === "/dashboard/work-list" ||
    Boolean(pathname?.startsWith("/dashboard/work-list/"));
  const hideChatHeader = isChatRoute && (isDesktopViewport || isChatRoomOpen);

  const rawDisplayName =
    user?.name ||
    user?.email?.split("@")[0] ||
    (role === "admin" || role === "super_admin" ? "Admin" : "User");

  const displayName = safeUserName(
    rawDisplayName,
    role === "admin" || role === "super_admin" ? "Admin" : "User",
  );

  const getFilteredAdminNavigation = () => {
    const userEmail = (user as { email?: string } | null)?.email;
    const showAdminManagement = canManageAdmins(userEmail);
    const isSuperAdmin = role === "super_admin";

    return adminNavigation.filter((item) => {
      if (item.href === "/admin/manage-admins") return showAdminManagement;
      if (item.href === "/admin/super-access") return isSuperAdmin;
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
    const hrefPath = href.split("?")[0];
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  };

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
    setAccountMenuOpen(false);
    logout();
    router.replace("/");
  };

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current?.contains(target)) return;
      setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsDesktopViewport(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isChatRoute) {
      setIsChatRoomOpen(false);
      return;
    }

    const onState = (event: Event) => {
      const detail = (
        event as CustomEvent<{ mode?: string; roomOpen?: boolean }>
      ).detail;
      if (detail?.mode !== "admin") return;
      setIsChatRoomOpen(Boolean(detail.roomOpen));
    };

    window.addEventListener("shop-chat:room-state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "shop-chat:room-state",
        onState as EventListener,
      );
  }, [isChatRoute]);

  useEffect(() => {
    if (!(role === "admin" || role === "super_admin" || role === "technician"))
      return;
    let active = true;
    const loadRepairAttention = async () => {
      try {
        const res = await fetch("/api/repair-requests", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!active || !json?.success) return;
        const requests = Array.isArray(json.data) ? json.data : [];
        const pendingRequests = requests.filter(
          (request: { status?: string }) =>
            String(request.status || "") === "pending",
        );
        const latestStamp = pendingRequests.reduce(
          (
            latest: string,
            request: { updatedAt?: string; createdAt?: string },
          ) => {
            const stamp = String(request.updatedAt || request.createdAt || "");
            if (!stamp) return latest;
            if (!latest) return stamp;
            return new Date(stamp).getTime() > new Date(latest).getTime()
              ? stamp
              : latest;
          },
          "",
        );
        const userId = String(
          (user as any)?._id || (user as any)?.id || "current",
        );
        const seenKey = `repair_requests_seen_admin_${userId}`;
        if (isRepairRoute) {
          if (latestStamp) window.localStorage.setItem(seenKey, latestStamp);
          setRepairAttentionCount(0);
          return;
        }
        const seenStamp = window.localStorage.getItem(seenKey) || "";
        const hasUnseen =
          !!latestStamp &&
          (!seenStamp ||
            new Date(latestStamp).getTime() > new Date(seenStamp).getTime());
        setRepairAttentionCount(hasUnseen ? pendingRequests.length : 0);
      } catch {}
    };
    void loadRepairAttention();
    const sub = sanityClient
      .listen('*[_type == "repairRequest"]', {}, { includeResult: false })
      .subscribe(() => void loadRepairAttention());
    return () => {
      active = false;
      sub.unsubscribe();
    };
  }, [role, user, isRepairRoute]);

  if (!mounted) return null;

  const accountMenuItems =
    role === "admin" || role === "super_admin" || role === "technician"
      ? [
          {
            label: "Update Profile",
            href: "/admin/settings/personal-information/profile",
            icon: User,
          },
          {
            label: "Update Password",
            href: "/admin/settings/personal-information/password",
            icon: Shield,
          },
          {
            label: "Notifications",
            href: "/admin/settings/notifications/in-app",
            icon: Megaphone,
          },
          { label: "Security", href: "/admin/settings/security", icon: Shield },
        ]
      : [
          {
            label: "Update Profile",
            href: "/customer/settings/personal-information/profile",
            icon: User,
          },
          {
            label: "Update Password",
            href: "/customer/settings/personal-information/password",
            icon: Shield,
          },
          {
            label: "Notifications",
            href: "/customer/settings/notifications/in-app",
            icon: Megaphone,
          },
          { label: "Guide", href: "/customer/welcome", icon: FileText },
        ];

  const renderAccountMenu = (compact = false) => (
    <div ref={accountMenuRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setAccountMenuOpen((open) => !open)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-slate-200 shadow-inner shadow-white/[0.03] backdrop-blur-xl transition hover:border-cyan-200/25 hover:bg-white/[0.09]"
        aria-label="Account options"
        title="Account options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {accountMenuOpen && (
        <div className="absolute bottom-full right-0 z-[280] mb-2 w-56 overflow-hidden rounded-xl border border-cyan-200/25 bg-[#07111f] p-1.5 text-white shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:22px_22px] opacity-20" />
          <div className="relative space-y-1">
            {!compact && (
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400">
                  {role === "super_admin"
                    ? "Super Admin"
                    : role === "admin"
                      ? "Administrator"
                      : role === "technician"
                        ? "Technician"
                        : "Customer"}
                </p>
              </div>
            )}
            {accountMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-cyan-300/10 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-cyan-100/70" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(false);
                window.location.reload();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-cyan-300/10 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 text-cyan-100/70" />
              <span>Refresh</span>
            </button>
            <div className="my-1 h-px bg-white/10" />
            <Link
              href="/?manual_home=1"
              onClick={() => {
                setAccountMenuOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-cyan-300/10 hover:text-white"
            >
              <HomeIcon className="h-4 w-4 text-cyan-100/70" />
              <span>Go to Homepage</span>
            </Link>
            <div className="my-1 px-3">
              <InstallButton className="w-full justify-center" />
            </div>
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-200 transition hover:bg-red-500/12 hover:text-red-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const Icon = item.icon;
    const hasChildren = !!(item.children && item.children.length > 0);
    const isExpanded = expandedItems === item.label;
    const active = isActive(item.href);
    const showChatDot =
      hasChatUnread && item.href.split("?")[0] === "/admin/chat";
    const showRepairDot =
      !isRepairRoute &&
      repairAttentionCount > 0 &&
      item.href.split("?")[0] === "/dashboard/work-list";

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
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`relative flex items-center gap-3 w-full px-3 py-2 rounded-md text-base ${
                active
                  ? "bg-slate-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.label === "Customers" && pendingRequestsCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold px-1.5">{pendingRequestsCount}</span>
              )}
              {(showChatDot || showRepairDot) && (
                <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
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

    if (hasChildren) {
      if (isDesktopNavMinimized) {
        return (
          <div key={item.label}>
            <Link
              href={item.href}
              title={item.label}
              className={`relative flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                active
                  ? "bg-gray-500 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.label === "Customers" && pendingRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-sky-500/30 text-sky-400 text-[10px] font-bold px-1">{pendingRequestsCount}</span>
                )}
              </div>
              {(showChatDot || showRepairDot) && (
                <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
              )}
            </Link>
          </div>
        );
      }

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
            try {
              if (value.startsWith("/admin/billing/create")) {
                localStorage.setItem("bill_create_skip_restore", "1");
              }
            } catch {}
            try {
              (
                globalThis as { __routeProgressStart?: () => void }
              ).__routeProgressStart?.();
            } catch {}
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
          className={`relative flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            active
              ? "bg-gray-500 text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Icon className="w-5 h-5" />
          {!isDesktopNavMinimized && (
            <span className="font-medium">{item.label}</span>
          )}
          {!isDesktopNavMinimized && item.label === "Customers" && pendingRequestsCount > 0 && (
            <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold px-1.5">{pendingRequestsCount}</span>
          )}
          {(showChatDot || showRepairDot) && (
            <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
          )}
        </Link>
      </div>
    );
  };

  return (
    <>
      {/* {!isMobileMenuOpen && !hideChatHeader && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="xl:hidden fixed right-4 top-4 z-[70] rounded-xl bg-gray-900/95 border border-gray-700 text-gray-200 shadow-lg backdrop-blur px-2 py-1.5"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )} */}

      {createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-slate-950/62 backdrop-blur-md xl:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 z-[210] flex h-[var(--app-vh,100dvh)] w-[85vw] max-w-sm flex-col border-l border-gray-800 bg-gray-900/94 shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden"
              >
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

                <div className="sm:p-4 p-3 space-y-2 flex-1 overflow-auto flex flex-col grow">
                  {navigation.map((item) => renderNavigationItem(item, true))}
                  <div className="pt-2 px-4">
                    <OnlineStatusToggle />
                  </div>
                </div>

                <div className="p-4 border-t border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                      <SanityImage
                        src={
                          (user as any)?.profileImage ||
                          (user as any)?.profileImageUrl
                        }
                        alt={displayName || "Profile"}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        fallback={<User className="w-5 h-5 text-white" />}
                      />
                    </div>
                    <div className="min-w-0">
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
                    {renderAccountMenu()}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <nav className="fixed left-0 top-0 z-50 hidden h-[var(--app-vh,100dvh)] w-[var(--admin-nav-w,16rem)] min-w-[var(--admin-nav-w,16rem)] flex-col overflow-hidden border-r-[0.5px] border-solid border-r-white/10 backdrop-blur-[2px] transition-[width,min-width] duration-200 xl:flex">
        <div className="shrink-0 p-4 border-b border-gray-800">
          <div
            className={`flex items-center ${isDesktopNavMinimized ? "justify-center" : "gap-3"}`}
          >
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
                <div className="min-w-0">
                  <h1 className="text-base font-semibold leading-tight tracking-normal text-white">
                    Jambh
                    <span className="block text-blue-200">Electrics</span>
                  </h1>
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

        <div className="min-h-0 flex-1 overflow-y-auto touch-pan-y sm:p-4 p-3 space-y-2">
          {navigation.map((item) => renderNavigationItem(item))}
          {!isDesktopNavMinimized && (
            <div className="pt-2">
              <OnlineStatusToggle />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              <SanityImage
                src={
                  (user as any)?.profileImage || (user as any)?.profileImageUrl
                }
                alt={displayName || "Profile"}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                fallback={<User className="w-5 h-5 text-white" />}
              />
            </div>
            {!isDesktopNavMinimized && (
              <div className="min-w-0">
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
            )}
            {renderAccountMenu(isDesktopNavMinimized)}
          </div>
        </div>
      </nav>

      {!hideChatHeader && <div className="h-[62px]" />}
      {!hideChatHeader && (
        <div className="admin-topbar fixed left-0 top-0 z-40 min-h-fit w-full border-b border-white/10 bg-slate-950/75 shadow-lg shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/55 transition-[left,width] duration-200">
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
                  className="xl:hidden bg-gray-900 border border-gray-700 max-sm:!py-2 relative"
                >
                  <Menu className="w-5 h-5" />
                  {hasChatUnread && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
