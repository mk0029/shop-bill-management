"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Languages, LayoutDashboard, Menu, X, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickLinks } from "@landing/lib/site-data";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { useAuthStore } from "@/store/auth-store";
import { getAuthenticatedHomeRoute } from "@/lib/auth-routes";

const navKeys = [
  "nav.home",
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

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "backdrop-blur-sm bg-white/10 shadow-glass"
            : "bg-transparent"
        }`}
      >
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
                  "glass-button rounded-xl px-3.5 py-2 text-sm font-medium",
                  getLinkClass(link.href),
                )}
              >
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
              className="glass-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#E5E7EB]"
              onClick={() => setOpen(true)}
              aria-label={t("common.menu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm xl:hidden duration-100 ease-linear"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-[80] w-full max-w-sm p-4 shadow-2xl xl:hidden animate-slide-in-right glass-strong">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-white">
                {t("common.menu")}
              </span>
              <button
                aria-label={t("common.closeMenu")}
                onClick={() => setOpen(false)}
                className="glass-button inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#E5E7EB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1 justify-between h-[90%]">
              <div className="flex flex-col gap-2">
                {filteredLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    suppressHydrationWarning
                    className={cn(
                      "glass text-center bg-slate-800/40 border border-solid border-white/20 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/10",
                      getLinkClass(link.href),
                    )}
                  >
                    {t(navKeys[quickLinks.indexOf(link)])}
                  </Link>
                ))}
                <div className="my-2 h-px glass-divider" />
              </div>
              {isAuthenticated ? (
                <Link href={getAuthenticatedHomeRoute(role)} onClick={() => setOpen(false)}>
                  <Button className="glass-button-primary h-10 w-full rounded-lg text-sm font-semibold text-sky-200 shadow-none">
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                    {t("common.dashboard")}
                  </Button>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button className="glass-button-primary h-10 w-full rounded-lg text-sm font-semibold text-sky-200 shadow-none">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
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
