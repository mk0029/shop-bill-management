"use client";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  MessageCircle,
  PackageCheck,
  Settings as SettingsIcon,
  User,
  Wrench,
  Calculator,
  X,
} from "lucide-react";
// removed Bell route link; notifications are accessed via header popover
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SanityImage } from "./sanity-image";
import Image from "next/image";
import NotificationsPopover from "@/components/ui/notifications-popover";
import OnlineStatusCustomerButton from "@/components/online/OnlineStatusCustomer";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { Wifi } from "lucide-react";
import CustomerNotifications from "./CustomerNotification";
import { useGlobalShopChat } from "@/lib/shop-chat/use-global-chat";
import { safeUserName } from "@/lib/display-text";

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  isDisabled?: boolean;
}

const customerNavigation: NavigationItem[] = [
  {
    label: "Bills",
    href: "/customer/bills",
    icon: FileText,
  },
  {
    label: "Chat",
    href: "/customer/chat",
    icon: MessageCircle,
  },
  {
    label: "Service Tasks",
    href: "/customer/work-tasks",
    icon: ClipboardList,
  },
  {
    label: "Settings",
    href: "/customer/settings",
    icon: SettingsIcon,
  },
  {
    label: "Rented Items",
    href: "/customer/rented-items",
    icon: PackageCheck,
  },
  {
    label: "Estimate fitting cos",
    href: "/customer/estimate-fitting",
    icon: Calculator,
  },
  {
    label: "Request Repair",
    href: "/customer/request-repair",
    icon: Wrench,
  },
];

export function CustomerNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { hasUnread: hasChatUnread } = useGlobalShopChat(user as any);
  const isAdmin = user?.role === "admin";
  const isChatRoute = pathname === "/customer/chat";

  // Admin-only: Online Status quick slider
  const [onlineStep, setOnlineStep] = useState(0); // 0 offline, 1 online(not at shop), 2 online(at shop)
  const [updating, setUpdating] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const mapStepToState = (s: number) => ({
    isOnline: s > 0,
    atShop: s === 2,
  });
  const mapStateToStep = (isOnline: boolean, atShop: boolean) => {
    if (!isOnline) return 0;
    if (isOnline && !atShop) return 1;
    return 2;
  };

  // init and realtime listen
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      // Try normal fetch first
      const init = await sanityApiService.online.getOnlineStatus();
      if (init?.success && init.data) {
        const d = init.data as { isOnline?: boolean; atShop?: boolean };
        setOnlineStep(mapStateToStep(!!d.isOnline, !!d.atShop));
      } else {
        // Fallback: hit server to ensure creation
        try {
          const res = await fetch("/api/online", { method: "GET" });
          const json: unknown = await res.json();
          const parsed = json as {
            success?: boolean;
            data?: { isOnline?: boolean; atShop?: boolean };
          };
          if (parsed?.success && parsed?.data) {
            const d = parsed.data;
            setOnlineStep(mapStateToStep(!!d.isOnline, !!d.atShop));
          }
        } catch {}
      }
    })();
    const sub = sanityClient
      .listen(
        '*[_type == "online" && _id == "onlineStatus"]',
        {},
        { includeResult: true },
      )
      .subscribe((u) => {
        const d = (u as { result?: { isOnline?: boolean; atShop?: boolean } })
          ?.result;
        if (!d) return;
        setOnlineStep(mapStateToStep(!!d.isOnline, !!d.atShop));
      });
    return () => sub.unsubscribe();
  }, [isAdmin]);

  const updateOnline = async (idx: 0 | 1 | 2) => {
    setUpdating(true);
    const mapped = mapStepToState(idx);
    const res = await sanityApiService.online.updateOnlineStatus({
      ...mapped,
      updatedAt: new Date().toISOString(),
    });
    setUpdating(false);
    if (!res.success) {
      // no toast in nav; silent fail
    }
  };

  const setIndex = (idx: 0 | 1 | 2) => {
    setOnlineStep(idx);
    void updateOnline(idx);
  };

  const stepWidth = 25.5; // px
  const knobLeft = onlineStep * stepWidth + 2; // 0->2px, 1->38px, 2->74px
  const handlePointerAt = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * 2) as 0 | 1 | 2;
    setIndex(idx);
  };
  const startMouseDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerAt(e.clientX);
    const onMove = (ev: MouseEvent) => handlePointerAt(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const startTouchDrag = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    handlePointerAt(t.clientX);
    const onMove = (ev: TouchEvent) => {
      const tt = ev.touches[0];
      if (tt) handlePointerAt(tt.clientX);
    };
    const onUp = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
  };

  const rawDisplayName = user?.name || "Customer";
  const displayName = safeUserName(rawDisplayName, "Customer");

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isDisabled = item.isDisabled;
    const showChatDot = hasChatUnread && item.href === "/customer/chat";

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
          className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            active
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
          {showChatDot && (
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
          )}
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
        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
        {showChatDot && (
          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <>
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
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Jambh Electric</h2>
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
                {isAdmin && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 mr-2">
                        <Wifi className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">
                          Availability
                        </span>
                      </div>
                      <div className="flex items-center pb-3 relative">
                        <div
                          role="slider"
                          aria-label="Availability"
                          aria-valuemin={0}
                          aria-valuemax={2}
                          aria-valuenow={onlineStep}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowRight") {
                              e.preventDefault();
                              const nextRight = Math.min(2, onlineStep + 1) as
                                | 0
                                | 1
                                | 2;
                              setIndex(nextRight);
                            } else if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              const nextLeft = Math.max(0, onlineStep - 1) as
                                | 0
                                | 1
                                | 2;
                              setIndex(nextLeft);
                            }
                          }}
                          onMouseDown={startMouseDrag}
                          onTouchStart={startTouchDrag}
                          ref={sliderRef}
                          className={`relative w-20 h-7 rounded-full border border-gray-500/60 bg-slate-700/40 backdrop-blur-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          <div className="absolute inset-0 grid grid-cols-3">
                            <button
                              type="button"
                              className="col-span-1"
                              onClick={() => setIndex(0)}
                              aria-label="Offline"
                            />
                            <button
                              type="button"
                              className="col-span-1"
                              onClick={() => setIndex(1)}
                              aria-label="Available"
                            />
                            <button
                              type="button"
                              className="col-span-1"
                              onClick={() => setIndex(2)}
                              aria-label="At shop"
                            />
                          </div>
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all duration-200 ease-out ${onlineStep === 2 ? "bg-green-300" : onlineStep === 1 ? "bg-amber-300" : "bg-slate-300"}`}
                            style={{ left: knobLeft }}
                          />
                          <div className="flex items-center justify-between text-[8px] text-gray-400 px-1 absolute -bottom-4 w-full">
                            <span>Offline</span>
                            <span>Available</span>
                            <span>At shop</span>
                          </div>
                        </div>
                        {updating && (
                          <span className="ml-2 text-[10px] text-gray-400">
                            Updating...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {customerNavigation.map((item) =>
                  renderNavigationItem(item, true),
                )}
              </div>

              {/* User Section */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                    <SanityImage
                      src={user?.profileImage}
                      alt={displayName || "Profile"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      fallback={<User className="w-5 h-5 text-white" />}
                    />
                  </div>
                  <div>
                    <p className="text-white font-medium">{displayName}</p>
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
      {/* Mobile Menu Button */}

      {/* Desktop Navigation */}
      <nav className="hidden lg:block w-64 bg-gray-900 border-r border-gray-800 h-screen fixed left-0 top-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 hidden text-white" />
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Image
                src="/je-p-48.png"
                alt="Logo"
                width={40}
                height={40}
                sizes="100vw"
                quality={100}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Jambh Electrics</h1>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="sm:p-4 p-3 space-y-2">
          {isAdmin && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mr-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Availability</span>
                </div>
                <div className="flex items-center pb-3 relative">
                  <div
                    role="slider"
                    aria-label="Availability"
                    aria-valuemin={0}
                    aria-valuemax={2}
                    aria-valuenow={onlineStep}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        const nextRight = Math.min(2, onlineStep + 1) as
                          | 0
                          | 1
                          | 2;
                        setIndex(nextRight);
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        const nextLeft = Math.max(0, onlineStep - 1) as
                          | 0
                          | 1
                          | 2;
                        setIndex(nextLeft);
                      }
                    }}
                    onMouseDown={startMouseDrag}
                    onTouchStart={startTouchDrag}
                    ref={sliderRef}
                    className={`relative w-20 h-7 rounded-full border border-gray-500/60 bg-slate-700/40 backdrop-blur-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <div className="absolute inset-0 grid grid-cols-3">
                      <button
                        type="button"
                        className="col-span-1"
                        onClick={() => setIndex(0)}
                        aria-label="Offline"
                      />
                      <button
                        type="button"
                        className="col-span-1"
                        onClick={() => setIndex(1)}
                        aria-label="Available"
                      />
                      <button
                        type="button"
                        className="col-span-1"
                        onClick={() => setIndex(2)}
                        aria-label="At shop"
                      />
                    </div>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all duration-200 ease-out ${onlineStep === 2 ? "bg-green-300" : onlineStep === 1 ? "bg-amber-300" : "bg-slate-300"}`}
                      style={{ left: knobLeft }}
                    />
                    <div className="flex items-center justify-between text-[8px] text-gray-400 px-1 absolute -bottom-4 w-full">
                      <span>Offline</span>
                      <span>Available</span>
                      <span>At shop</span>
                    </div>
                  </div>
                  {updating && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      Updating...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {customerNavigation.map((item) => renderNavigationItem(item))}
        </div>

        {/* User Section - Desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              <SanityImage
                src={user?.profileImage}
                alt={displayName || "Profile"}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                fallback={<User className="w-5 h-5 text-white" />}
              />
            </div>
            <div>
              <p className="text-white font-medium">{displayName}</p>
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
      {!isChatRoute && <div className="lg:ml-64 min-h-fit bg-gray-950">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 xl:px-6 xl:py-6">
          <div className="flex items-center justify-between">
            <div className="max-md:hidden">
              <h1 className="text-xl font-bold !leading-[120%] text-white">
                {customerNavigation.find((item) => isActive(item.href))
                  ?.label || "Home"}
              </h1>
            </div>
            <div className="flex items-center gap-4 justify-end w-full">
              <Link
                href="/customer/chat"
                className="relative inline-flex h-10 items-center justify-center gap-2 rounded-md border border-orange-400/30 bg-orange-500 px-3 text-sm font-semibold text-gray-950 shadow-sm transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 max-sm:w-10 max-sm:px-0"
                title="Open chat"
                aria-label="Open chat"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="max-sm:hidden">Chat</span>
                {hasChatUnread && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-gray-900 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.95)] animate-pulse" />
                )}
              </Link>
              {isAdmin ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mr-2">
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Availability</span>
                  </div>
                  <div className="flex items-center pb-3 relative">
                    <div
                      role="slider"
                      aria-label="Availability"
                      aria-valuemin={0}
                      aria-valuemax={2}
                      aria-valuenow={onlineStep}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight") {
                          e.preventDefault();
                          const nextRight = Math.min(2, onlineStep + 1) as
                            | 0
                            | 1
                            | 2;
                          setIndex(nextRight);
                        } else if (e.key === "ArrowLeft") {
                          e.preventDefault();
                          const nextLeft = Math.max(0, onlineStep - 1) as
                            | 0
                            | 1
                            | 2;
                          setIndex(nextLeft);
                        }
                      }}
                      onMouseDown={startMouseDrag}
                      onTouchStart={startTouchDrag}
                      ref={sliderRef}
                      className={`relative w-20 h-7 rounded-full border border-gray-500/60 bg-slate-700/40 backdrop-blur-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <div className="absolute inset-0 grid grid-cols-3">
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(0)}
                          aria-label="Offline"
                        />
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(1)}
                          aria-label="Available"
                        />
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(2)}
                          aria-label="At shop"
                        />
                      </div>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all duration-200 ease-out ${onlineStep === 2 ? "bg-green-300" : onlineStep === 1 ? "bg-amber-300" : "bg-slate-300"}`}
                        style={{ left: knobLeft }}
                      />
                      <div className="flex items-center justify-between text-[8px] text-gray-400 px-1 absolute -bottom-4 w-full">
                        <span>Offline</span>
                        <span>Available</span>
                        <span>At shop</span>
                      </div>
                    </div>
                    {updating && (
                      <span className="ml-2 text-[10px] text-gray-400">
                        Updating...
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <OnlineStatusCustomerButton />
              )}
              <CustomerNotifications />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden relative"
            >
              <Menu className="w-5 h-5" />
              {hasChatUnread && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
              )}
            </Button>
          </div>
        </div>
      </div>}
    </>
  );
}
