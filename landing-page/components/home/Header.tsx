"use client";

import Link from "next/link";
import Image from "next/image";
import { Languages, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      className="group inline-flex h-10 items-center gap-1 rounded-full border border-slate-700 bg-slate-950/95 p-1 shadow-inner shadow-black/20 transition hover:border-sky-500/70 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label={t("common.language")}
      title={t("common.language")}
    >
      <Languages className="ml-2 hidden h-4 w-4 text-sky-300 lg:block" />
      {options.map((item) => (
        <span
          key={item.code}
          className={`relative grid h-8 min-w-[4.35rem] place-items-center overflow-hidden rounded-full px-3 text-sm font-semibold transition sm:min-w-[5rem] ${
            language === item.code
              ? "text-white opacity-100"
              : "text-slate-300 opacity-25 group-hover:opacity-45"
          }`}
        >
          {language === item.code ? (
            <motion.span
              layoutId="landing-language-pill"
              className="absolute inset-0 rounded-full bg-sky-500/25 shadow-sm ring-1 ring-sky-300/50"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          ) : null}
          <span className="relative">{item.label}</span>
        </span>
      ))}
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
      <header className="sticky top-0 z-50 border-b border-sky-900/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/je-p-48.png"
              alt={t("common.brand")}
              width={48}
              height={48}
            />
            <span className="hidden text-base font-semibold leading-none text-slate-100 sm:block">
              {t("common.brand")}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {quickLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium leading-none text-slate-200 transition hover:text-white"
              >
                {t(navKeys[index])}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageToggle />
            <Link href="/login">
              <Button
                size="lg"
                className="h-11 px-6 text-base font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400"
              >
                {t("common.login")}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle />
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-700 text-slate-100"
              onClick={() => setOpen(true)}
              aria-label={t("common.menu")}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/65 md:hidden"
              aria-label={t("common.closeMenuOverlay")}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[80] w-full border-l border-slate-700 bg-slate-950 p-5 shadow-2xl md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-100">
                  {t("common.menu")}
                </span>
                <button
                  aria-label={t("common.closeMenu")}
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 p-1 text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {quickLinks.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base text-slate-200 hover:bg-slate-800"
                  >
                    {t(navKeys[index])}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2"
                >
                  <Button className="h-11 w-full text-base font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400">
                    {t("common.login")}
                  </Button>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
