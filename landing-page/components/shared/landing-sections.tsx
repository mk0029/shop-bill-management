"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Phone,
  ShieldCheck,
  BadgeCheck,
  HandCoins,
  Timer,
  MessageCircleCode,
  MessageCircleIcon,
  PhoneIcon,
} from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import MessageBubble from "@/components/shop-chat/source/MessageBubble";

const hindiHeroHeadingStyle = {
  lineHeight: 1.2,
} as const;

const hindiSectionHeadingStyle = {
  lineHeight: 1.24,
} as const;

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    document.querySelectorAll(".scroll-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

export function HeroSection({
  support,
}: {
  support: { phone: string; whatsapp: string };
}) {
  const { t, language } = useLandingLanguage();
  const isHindi = language === "hi";
  const badges = [
    { icon: BadgeCheck, label: t("hero.badges.skilledElectricians") },
    { icon: ShieldCheck, label: t("hero.badges.safetyFirst") },
    { icon: HandCoins, label: t("hero.badges.genuinePricing") },
    { icon: Timer, label: t("hero.badges.fastSupport") },
  ];

  return (
    <section className="relative overflow-hidden " id="home">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/5 to-transparent" />
      <div className="container mx-auto px-4 py-11 md:py-32 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center max-sm:pt-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-sky-300/80 animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-glow" />
              {t("hero.eyebrow")}
            </div>
            <h1
              className={`text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] ${isHindi ? "" : ""}`}
              style={isHindi ? hindiHeroHeadingStyle : undefined}
            >
              {t("hero.title")}
            </h1>
            <p className="text-lg text-[#B8C0CC] leading-relaxed max-w-lg">
              {t("hero.copy")}
            </p>
            <div className="flex gap-3 pt-2">
              <a
                href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="glass-button-primary inline-flex h-12 items-center rounded-2xl px-6 text-base font-semibold text-sky-200 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {t("hero.whatsapp")}
              </a>
              <a
                href={`tel:${support.phone}`}
                className="glass-button inline-flex h-12 items-center rounded-2xl px-6 text-base font-semibold text-[#E5E7EB] gap-2"
              >
                <Phone className="h-4 w-4" />
                {t("hero.callNow")}
              </a>
            </div>
            <div className="flex items-center gap-5 text-sm text-[#B8C0CC] flex-wrap pt-2">
              {badges.map((badge) => (
                <p key={badge.label} className="flex items-center gap-2">
                  <badge.icon className="size-5 text-sky-400/80" />
                  {badge.label}
                </p>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="ambient-glow w-72 h-72 bg-sky-500/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="glass-card-static aspect-square w-full max-w-md flex items-center justify-center p-8">
              <Image
                alt="brand"
                src="/je-p-512.png"
                width={320}
                height={320}
                className="w-full h-auto object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  const { language } = useLandingLanguage();
  const isHindi = language === "hi";

  return (
    <div className="mx-auto max-w-3xl text-center space-y-4">
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-sky-300/80">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-glow" />
          {eyebrow}
        </div>
      ) : null}
      <h2
        className={`font-bold text-white ${isHindi ? "text-3xl md:text-4xl" : "text-3xl md:text-5xl leading-[1.1]"}`}
        style={isHindi ? hindiSectionHeadingStyle : undefined}
      >
        {title}
      </h2>
      {copy ? (
        <p className="text-base md:text-lg text-[#B8C0CC] leading-relaxed max-w-2xl mx-auto">
          {copy}
        </p>
      ) : null}
    </div>
  );
}

export function PremiumCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`glass-card h-full p-6 md:p-7 group ${className}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-500/5 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-500/5 to-transparent rounded-tr-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100" />
      {children}
    </article>
  );
}

export function IconBox({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent";
}) {
  const colors = {
    primary: "from-sky-500/15 to-sky-400/5 text-sky-400",
    secondary: "from-violet-500/15 to-violet-400/5 text-violet-400",
    accent: "from-indigo-500/15 to-indigo-400/5 text-indigo-400",
  };
  return (
    <div
      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colors[variant]} flex items-center justify-center ring-1 ring-white/5 group-hover:ring-white/10 transition-all duration-500`}
    >
      {children}
    </div>
  );
}

export function TranslatedText({
  translationKey,
  className,
}: {
  translationKey: string;
  className?: string;
}) {
  const { t } = useLandingLanguage();
  return <p className={className}>{t(translationKey)}</p>;
}

export function GlassDivider() {
  return (
    <div className="relative py-5 md:py-8">
      <div className="glass-separator mx-auto max-w-4xl" />
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-400/20" />
    </div>
  );
}

export function FooterSection({
  support,
}: {
  support: { phone: string; whatsapp: string; email: string };
}) {
  const { t } = useLandingLanguage();
  const serviceLinks = [
    t("footer.serviceLinks.homeElectricalService"),
    t("footer.serviceLinks.productSales"),
    t("footer.serviceLinks.newWiring"),
    t("footer.serviceLinks.faultDetection"),
    t("footer.serviceLinks.applianceRepair"),
    t("footer.serviceLinks.toolRental"),
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/[0.02] to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 py-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="text-base font-bold text-white tracking-tight">
              {t("common.brand")}
            </div>
            <p className="text-sm text-[#B8C0CC] leading-relaxed hidden md:block">
              {t("footer.copy")}
            </p>
            <div className="flex gap-2">
              <a
                href={`tel:${support.phone}`}
                className="glass-button w-9 h-9 rounded-lg flex items-center justify-center text-[#B8C0CC] hover:text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                className="glass-button w-9 h-9 rounded-lg flex items-center justify-center text-[#B8C0CC] hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
              {t("footer.quickLinks")}
            </div>
            <ul className="space-y-2">
              {[
                { label: t("nav.about"), href: "/about" },
                { label: t("nav.services"), href: "/services" },
                { label: t("nav.products"), href: "/products" },
                { label: t("nav.pricing"), href: "/pricing" },
                { label: t("nav.contact"), href: "/contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#B8C0CC] hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
              {t("footer.services")}
            </div>
            <ul className="space-y-2">
              {serviceLinks.map((item) => (
                <li key={item} className="text-sm text-[#B8C0CC]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
              {t("footer.contactPolicies")}
            </div>
            <ul className="space-y-2 text-sm text-[#B8C0CC]">
              <li>
                <a
                  href={`tel:${support.phone}`}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {support.phone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <MessageCircleIcon className="w-4 h-4" />
                  {support.whatsapp}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${support.email}`}
                  className="hover:text-white transition-colors"
                >
                  {support.email}
                </a>
              </li>
              <li className="text-[#B8C0CC]/70">{t("footer.workingHours")}</li>
              <li className="pt-1 flex flex-wrap gap-x-2">
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.terms")}
                </Link>
                <span className="text-white/20">·</span>
                <Link
                  href="/privacy-policy"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
                <span className="text-white/20">·</span>
                <Link
                  href="/refund-policy"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.refund")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/5 text-xs text-[#B8C0CC]/50 text-center">
          &copy; {new Date().getFullYear()} {t("common.brand")}.{" "}
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
