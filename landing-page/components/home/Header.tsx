"use client";

import Link from "next/link";
import Image from "next/image";
import { Languages, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { quickLinks } from "@landing/lib/site-data";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

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
      className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      aria-label={t("common.language")}
      title={t("common.language")}
    >
      <Languages className="h-4 w-4" />
      {options.find((o) => o.code === language)?.label}
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const { t } = useLandingLanguage();

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
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/je-p-48.png"
              alt={t("common.brand")}
              width={48}
              height={48}
            />
            <span className="hidden text-base font-semibold leading-none sm:block">
              {t("common.brand")}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(navKeys[quickLinks.indexOf(link)])}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageToggle />
            <Link href="/login">
              <Button size="lg" className="h-10 px-5 text-sm font-semibold">
                {t("common.login")}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle />
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground"
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
            className="fixed inset-0 z-[70] bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-[80] w-full max-w-sm border-l border-border bg-background p-5 shadow-lg md:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">{t("common.menu")}</span>
              <button
                aria-label={t("common.closeMenu")}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-base text-muted-foreground hover:bg-muted"
                >
                  {t(navKeys[quickLinks.indexOf(link)])}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2"
              >
                <Button className="h-11 w-full text-base font-semibold">
                  {t("common.login")}
                </Button>
              </Link>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
