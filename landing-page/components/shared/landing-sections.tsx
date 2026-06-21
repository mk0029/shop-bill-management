"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Phone,
  ShieldCheck,
  BadgeCheck,
  HandCoins,
  Timer,
} from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

const hindiHeroHeadingStyle = {
  lineHeight: 1.2,
} as const;

const hindiSectionHeadingStyle = {
  lineHeight: 1.24,
} as const;

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
    <section className="relative overflow-hidden" id="home">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="container mx-auto px-4 py-14 md:py-28 relative">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className={`mb-3 font-semibold uppercase tracking-[0.18em] text-primary ${isHindi ? "text-sm sm:text-[15px]" : "text-xs"}`}>
              {t("hero.eyebrow")}
            </p>
            <h1
              className={`text-4xl md:text-5xl font-bold tracking-tight ${isHindi ? "" : ""}`}
              style={isHindi ? hindiHeroHeadingStyle : undefined}
            >
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              {t("hero.copy")}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("hero.whatsapp")}
              </a>
              <a
                href={`tel:${support.phone}`}
                className="inline-flex h-11 items-center rounded-md bg-secondary px-5 text-base font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Phone className="mr-2 h-4 w-4" />
                {t("hero.callNow")}
              </a>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              {badges.map((badge) => (
                <p key={badge.label} className="flex items-center gap-2 text-base">
                  <badge.icon className="size-6 text-primary" />
                  {badge.label}
                </p>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-xl bg-gray-900 border border-border flex items-center justify-center relative">
              <Image
                alt="brand"
                src="/je-p-512.png"
                fill
                className="w-full h-auto absolute top-0 left-0 z-10 object-contain"
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
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p
          className={`font-semibold uppercase tracking-[0.16em] text-primary ${isHindi ? "text-sm sm:text-[15px]" : "text-xs"}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`mt-2 font-bold text-foreground ${isHindi ? "text-3xl md:text-4xl" : "text-3xl leading-[1.18] md:text-4xl"}`}
        style={isHindi ? hindiSectionHeadingStyle : undefined}
      >
        {title}
      </h2>
      {copy ? (
        <p className="mt-3 text-base leading-7 text-muted-foreground">{copy}</p>
      ) : null}
    </div>
  );
}

export function PremiumCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="h-full rounded-xl border border-border bg-card p-5">
      {children}
    </article>
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
    <footer className="container mx-auto px-4 py-10">
      <div className="grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg font-semibold">{t("common.brand")}</div>
          <p className="mt-3 text-muted-foreground">
            {t("footer.copy")}
          </p>
        </div>
        <div>
          <div className="font-semibold">{t("footer.quickLinks")}</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="text-base font-normal">
              <Link href="/about" className="hover:text-foreground">{t("nav.about")}</Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/services" className="hover:text-foreground">{t("nav.services")}</Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/products" className="hover:text-foreground">{t("nav.products")}</Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/pricing" className="hover:text-foreground">{t("nav.pricing")}</Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/contact" className="hover:text-foreground">{t("nav.contact")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">{t("footer.services")}</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {serviceLinks.map((item) => (
              <li key={item} className="text-base font-normal">{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold">{t("footer.contactPolicies")}</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="text-base font-normal">
              <a href={`tel:${support.phone}`} className="hover:text-foreground">{support.phone}</a>
            </li>
            <li className="text-base font-normal">
              <a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="hover:text-foreground">{t("footer.whatsappLabel")}: {support.whatsapp}</a>
            </li>
            <li className="text-base font-normal">
              <a href={`mailto:${support.email}`} className="hover:text-foreground">{support.email}</a>
            </li>
            <li className="text-base font-normal">{t("footer.workingHours")}</li>
            <li className="pt-2">
              <Link href="/terms" className="hover:text-foreground">{t("footer.terms")}</Link>
              {" "}·{" "}
              <Link href="/privacy-policy" className="hover:text-foreground">{t("footer.privacy")}</Link>
              {" "}·{" "}
              <Link href="/refund-policy" className="hover:text-foreground">{t("footer.refund")}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t text-xs text-muted-foreground text-center">
        (c) {new Date().getFullYear()} {t("common.brand")}. {t("footer.copyright")}
      </div>
    </footer>
  );
}
