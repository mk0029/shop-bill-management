"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Drill,
  Home,
  IndianRupee,
  Info,
  Languages,
  LayoutDashboard,
  Menu,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackClose } from "@/hooks/useBackClose";
import { quickLinks } from "@landing/lib/site-data";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { useAuthStore } from "@/store/auth-store";
import { getAuthenticatedHomeRoute } from "@/lib/auth-routes";

type MobileNavItem = {
  href: string;
  navKey: string;
  icon: LucideIcon;
};

type MobileNavSection = {
  titleKey: string;
  items: MobileNavItem[];
};

const mobileNavSections: MobileNavSection[] = [
  {
    titleKey: "nav.sections.main",
    items: [
      { href: "/", navKey: "nav.home", icon: Home },
      { href: "/shop-items", navKey: "nav.shopItems", icon: ShoppingBag },
      { href: "/products", navKey: "nav.products", icon: Package },
      { href: "/services", navKey: "nav.services", icon: Wrench },
    ],
  },
  {
    titleKey: "nav.sections.business",
    items: [
      { href: "/pricing", navKey: "nav.pricing", icon: IndianRupee },
      { href: "/rent-tools", navKey: "nav.rentTools", icon: Drill },
    ],
  },
  {
    titleKey: "nav.sections.company",
    items: [
      { href: "/about", navKey: "nav.about", icon: Info },
      { href: "/contact", navKey: "nav.contact", icon: Phone },
    ],
  },
  {
    titleKey: "nav.sections.account",
    items: [
      {
        href: "/request-account",
        navKey: "nav.requestAccount",
        icon: UserPlus,
      },
    ],
  },
];

const navKeys = [
  "nav.home",
  "nav.shopItems",
  "nav.about",
  "nav.services",
  "nav.products",
  "nav.pricing",
  "nav.rentTools",
  "nav.contact",
  "nav.requestAccount",
];

function LanguageToggle() {
  const { language, setLanguage, t } = useLandingLanguage();
  const isHindi = language === "hi";
  const nextLanguage = isHindi ? "en" : "hi";
  const options = [
    { code: "en" as const, label: t("common.english") },
    { code: "hi" as const, label: t("common.hindi") },
  ];

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className="glass-button inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[#E5E7EB]"
      aria-label={t("common.language")}
      title={t("common.language")}
    >
      <Languages className="h-3.5 w-3.5" />
      {options.find((o) => o.code === language)?.label}
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const { t } = useLandingLanguage();
  const pathname = usePathname();
  const { isAuthenticated, role } = useAuthStore();

  const filteredLinks = isAuthenticated
    ? quickLinks.filter((link) => link.href !== "/request-account")
    : quickLinks;

  const visibleSections = isAuthenticated
    ? mobileNavSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => item.href !== "/request-account",
          ),
        }))
        .filter((section) => section.items.length > 0)
    : mobileNavSections;

  const getLinkClass = (href: string) =>
    cn(
      "transition-colors",
      pathname === href
        ? "text-white bg-white/10"
        : "text-[#B8C0CC] hover:text-white",
    );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    if (open) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
      body.style.touchAction = "none";
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
      body.style.touchAction = prevBodyTouchAction ?? "";
      html.style.overflow = prevHtmlOverflow ?? "";
    }
    return () => {
      body.style.overflow = prevBodyOverflow ?? "";
      html.style.overflow = prevHtmlOverflow ?? "";
      body.style.touchAction = prevBodyTouchAction ?? "";
    };
  }, [open]);

  useBackClose({
    isOpen: open,
    onClose: () => setOpen(false),
    id: "landing-mobile-menu",
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "backdrop-blur-sm bg-white/10 shadow-glass"
            : "bg-transparent"
        }`}>
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/je-p-48.png"
                alt={t("common.brand")}
                width={40}
                height={40}
                className="transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <span className="hidden text-base font-bold text-white tracking-tight sm:block">
              {t("common.brand")}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                suppressHydrationWarning
                className={cn(
                  "glass-button rounded-xl px-3.5 py-2 text-sm font-medium !bg-slate-900/90",
                  getLinkClass(link.href),
                )}>
                {t(navKeys[quickLinks.indexOf(link)])}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <LanguageToggle />
            {isAuthenticated ? (
              <Link href={getAuthenticatedHomeRoute(role)}>
                <Button className="glass-button-primary h-10 rounded-xl px-5 text-sm font-semibold text-sky-200 shadow-none">
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  {t("common.dashboard")}
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="glass-button-primary h-10 rounded-xl px-5 text-sm font-semibold text-sky-200 shadow-none">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {t("common.login")}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <LanguageToggle />
            <button
              type="button"
              className="glass-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#E5E7EB]"
              onClick={() => setOpen(true)}
              aria-label={t("common.menu")}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm xl:hidden duration-100 ease-linear"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === " ") setOpen(false);
            }}
            role="presentation"
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 right-0 z-[80] flex h-[var(--app-vh,100dvh)] w-[90vw] max-w-[400px] flex-col rounded-l-2xl border-l border-white/10 bg-slate-950/90 shadow-2xl shadow-black/50 backdrop-blur-2xl xl:hidden animate-slide-in-right motion-reduce:animate-none"
            role="dialog"
            aria-modal="true"
            aria-label={t("common.menu")}>
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[calc(var(--safe-area-top)+10px)]">
              <span className="text-base font-semibold text-white">
                {t("common.menu")}
              </span>
              <button
                type="button"
                aria-label={t("common.closeMenu")}
                onClick={() => setOpen(false)}
                className="glass-button inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#E5E7EB]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 h-px shrink-0 glass-divider" />

            <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4 hide-scroll">
              {visibleSections.map((section) => (
                <div key={section.titleKey} className="mb-5 last:mb-0">
                  <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {t(section.titleKey)}
                  </div>
                  <div className="flex flex-col gap-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          suppressHydrationWarning
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-[#B8C0CC] hover:bg-white/5 hover:text-white",
                          )}>
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isActive
                                ? "bg-sky-400/15 text-sky-300"
                                : "text-white/45",
                            )}>
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="truncate">{t(item.navKey)}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 px-4 pt-3 pb-[calc(var(--safe-area-bottom)+12px)]">
              {isAuthenticated ? (
                <Link
                  href={getAuthenticatedHomeRoute(role)}
                  onClick={() => setOpen(false)}>
                  <Button className="glass-button-primary h-[52px] w-full rounded-xl text-sm font-semibold text-sky-200 shadow-none">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {t("common.dashboard")}
                  </Button>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button className="glass-button-primary h-[52px] w-full rounded-xl text-sm font-semibold text-sky-200 shadow-none">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("common.login")}
                  </Button>
                </Link>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
