"use client";

import Header from "@landing/components/home/Header";
import {
  FooterSection,
  GlassDivider,
  HeroSection,
  PremiumCard,
  IconBox,
  SectionTitle,
} from "@landing/components/shared/landing-sections";
import ElectricalBackground from "@landing/components/shared/ElectricalBackground";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import {
  faqs,
  pricingHighlights,
  processSteps,
  services,
  whyChooseUs,
} from "@landing/lib/site-data";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Phone,
  Zap,
  Sparkles,
  Bolt,
  ShieldCheck,
  Clock,
  Star,
} from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { useEffect, useRef } from "react";

type LandingSupport = {
  email: string;
  phone: string;
  whatsapp: string;
};

const serviceKeys = [
  "electrical-product-sales",
  "home-electrical-services",
  "new-wiring-fitting",
  "appliance-repair",
  "fault-detection",
  "tool-rental",
];

const whyKeys = [
  "experiencedElectricians",
  "qualityWorkmanship",
  "onTimeService",
  "transparentPricing",
  "safePractices",
  "qualityMaterials",
  "clearCommunication",
  "localTrustedSupport",
];

const processKeys = [
  "requestService",
  "inspectRequirement",
  "estimateShared",
  "workCompleted",
  "paymentSupport",
];

const pricingKeys = ["inspection", "homeService", "wiring", "emergency"];

const faqKeys = [
  "homeService",
  "applianceRepair",
  "warranty",
  "pricing",
  "tools",
  "hours",
  "emergency",
];

const serviceIcons: Record<string, string> = {
  "electrical-product-sales": "primary",
  "home-electrical-services": "secondary",
  "new-wiring-fitting": "accent",
  "appliance-repair": "primary",
  "fault-detection": "secondary",
  "tool-rental": "accent",
};

function ScrollRevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scroll-reveal ${className}`}>
      {children}
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-3 py-2 text-center">
      <p className="text-lg font-bold text-gradient">{value}</p>
      <p className="text-xs text-[#B8C0CC] mt-0.5">{label}</p>
    </div>
  );
}

export default function LandingHomeContent({
  support,
}: {
  support: LandingSupport;
}) {
  const { t } = useLandingLanguage();

  return (
    <ElectricalBackground>
      <div className="h-[var(--app-vh,100dvh)] text-[#E5E7EB]">
        <Header />
        <main>
          <HeroSection
            support={{ phone: support.phone, whatsapp: support.whatsapp }}
          />

          <section className="container mx-auto px-4 -mt-8 relative z-20  max-sm:pb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              <StatBadge label="Happy Customers" value="500+" />
              <StatBadge label="Services Done" value="1.2K+" />
              <StatBadge label="Years Trusted" value="8+" />
              <StatBadge label="Tools Available" value="40+" />
            </div>
          </section>

          <GlassDivider />

          <section
            id="services"
            className="container mx-auto px-4 py-11 md:py-24"
          >
            <ScrollRevealSection>
              <SectionTitle
                eyebrow={t("services.eyebrow")}
                title={t("services.title")}
                copy={t("services.copy")}
              />
            </ScrollRevealSection>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 6).map((item, index) => (
                <ScrollRevealSection key={item.slug}>
                  <PremiumCard>
                    <div className="flex items-start gap-4 mb-4">
                      <IconBox
                        variant={
                          (serviceIcons[item.slug] || "primary") as
                            | "primary"
                            | "secondary"
                            | "accent"
                        }
                      >
                        <item.icon className="h-5 w-5" />
                      </IconBox>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white leading-tight">
                          {t(`services.items.${serviceKeys[index]}.title`)}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className="h-3 w-3 text-sky-400/60 fill-sky-400/60"
                            />
                          ))}
                          <span className="text-xs text-[#B8C0CC] ml-1">
                            (4.8)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-400/30 via-violet-400/20 to-transparent rounded-full" />
                      <p className="text-sm leading-relaxed text-[#B8C0CC] pl-4 border-l border-white/5">
                        {t(
                          `services.items.${serviceKeys[index]}.shortDescription`,
                        )}
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-[#B8C0CC]/60">
                        <Bolt className="h-3 w-3" />
                        <span>Available now</span>
                      </div>
                      <Link
                        href={`/services/${item.slug}`}
                        className="inline-flex items-center text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors group/link"
                      >
                        {t("common.viewDetails")}
                        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                      </Link>
                    </div>
                  </PremiumCard>
                </ScrollRevealSection>
              ))}
            </div>
          </section>

          <GlassDivider />

          <section id="about" className="py-11 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("why.eyebrow")}
                  title={t("why.title")}
                  copy={t("why.copy")}
                />
              </ScrollRevealSection>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {whyChooseUs.map((item) => (
                  <ScrollRevealSection key={item.title}>
                    <PremiumCard>
                      <div className="flex items-center gap-3 mb-4">
                        <IconBox variant="secondary">
                          <item.icon className="h-5 w-5" />
                        </IconBox>
                        <h3 className="text-base font-semibold text-white flex-1">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-sm text-[#B8C0CC] leading-relaxed pl-1">
                        {item.copy}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-[#B8C0CC]/50">
                        <Sparkles className="h-3 w-3 text-sky-400/60" />
                        <span>Trusted by locals</span>
                      </div>
                    </PremiumCard>
                  </ScrollRevealSection>
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section className="container mx-auto px-4 py-11 md:py-24">
            <ScrollRevealSection>
              <SectionTitle
                eyebrow={t("process.eyebrow")}
                title={t("process.title")}
              />
            </ScrollRevealSection>
            <div className="mx-auto mt-10 max-w-6xl relative">
              <div className="absolute top-12 left-8 right-8 h-px bg-gradient-to-r from-sky-500/20 via-violet-500/20 to-transparent hidden lg:block" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {processSteps.map((step, index) => (
                  <ScrollRevealSection key={step}>
                    <div className="glass-card p-4 text-center group relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-2 ring-1 ring-white/5 group-hover:ring-sky-400/20 transition-all duration-500">
                        <span className="text-sm font-bold text-gradient">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-[#E5E7EB] font-medium">
                        {t(`process.steps.${processKeys[index]}`)}
                      </p>
                    </div>
                  </ScrollRevealSection>
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section id="pricing" className="py-11 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("pricing.eyebrow")}
                  title={t("pricing.title")}
                  copy={t("pricing.copy")}
                />
              </ScrollRevealSection>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {pricingHighlights.map((item, index) => (
                  <ScrollRevealSection key={item.title}>
                    <PremiumCard>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-semibold text-white text-sm uppercase tracking-wider text-sky-400/80">
                          {t(`pricing.items.${pricingKeys[index]}.title`)}
                        </h3>
                      </div>
                      <p className="text-3xl font-bold text-gradient">
                        {t(`pricing.items.${pricingKeys[index]}.price`)}
                      </p>
                      <div className="mt-4 h-px bg-gradient-to-r from-sky-500/20 via-violet-500/10 to-transparent" />
                      <p className="mt-4 text-sm text-[#B8C0CC] leading-relaxed">
                        {t(`pricing.items.${pricingKeys[index]}.note`)}
                      </p>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-sky-400/60">
                        <Clock className="h-3 w-3" />
                        <span>No hidden charges</span>
                      </div>
                    </PremiumCard>
                  </ScrollRevealSection>
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section
            id="rent-tools"
            className="container mx-auto px-4 py-11 md:py-24"
          >
            <ScrollRevealSection>
              <div className="glass-card p-8 md:p-10 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-bl from-sky-500/10 to-transparent rounded-full" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-white/5 shrink-0">
                      <Zap className="h-7 w-7 text-sky-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white">
                        {t("rentTools.title")}
                      </h2>
                      <p className="text-sm text-[#B8C0CC]/60 mt-1">
                        Flexible rental plans
                      </p>
                    </div>
                  </div>
                  <p className="max-w-2xl text-[#B8C0CC] leading-relaxed">
                    {t("rentTools.copy")}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="glass rounded-xl px-4 py-2 text-sm text-sky-300 inline-flex items-center gap-2">
                      <Bolt className="h-3.5 w-3.5" />
                      {t("rentTools.hourly")}
                    </span>
                    <span className="glass rounded-xl px-4 py-2 text-sm text-violet-300 inline-flex items-center gap-2">
                      <Bolt className="h-3.5 w-3.5" />
                      {t("rentTools.daily")}
                    </span>
                  </div>
                  <Link
                    href="/rent-tools"
                    className="glass-button-primary mt-6 inline-flex items-center rounded-2xl px-6 py-3 text-sm font-semibold text-sky-200 gap-2 group/btn"
                  >
                    <Sparkles className="h-4 w-4 transition-transform group-hover/btn:rotate-12 duration-300" />
                    {t("rentTools.cta")}
                  </Link>
                </div>
              </div>
            </ScrollRevealSection>
          </section>

          <GlassDivider />

          <section id="request" className="py-11 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("account.eyebrow")}
                  title={t("account.title")}
                  copy={t("account.copy")}
                />
              </ScrollRevealSection>
              <div className="mx-auto mt-10 max-w-4xl">
                <div className="glass-card p-3 sm:p-5 md:p-8 lg:p-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-sky-500/5 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="relative z-10">
                    <RequestAccountForm
                      support={{
                        email: support.email,
                        whatsapp: support.whatsapp,
                      }}
                      compact
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <GlassDivider />

          <section className="py-11 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("faq.eyebrow")}
                  title={t("faq.title")}
                />
              </ScrollRevealSection>
              <div className="mx-auto mt-10 max-w-4xl space-y-4">
                {faqs.map((faq, index) => (
                  <ScrollRevealSection key={faq.q}>
                    <details className="glass-card p-5 group open:bg-white/[0.08]">
                      <summary className="cursor-pointer text-base font-medium text-white list-none flex items-center justify-between gap-4">
                        <span className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60 group-open:bg-sky-400 transition-colors" />
                          <span>{t(`faq.items.${faqKeys[index]}.q`)}</span>
                        </span>
                        <span className="text-sky-400/60 group-open:rotate-180 transition-transform duration-300 shrink-0">
                          ▾
                        </span>
                      </summary>
                      <div className="mt-3 ml-4 pl-4 border-l border-white/5">
                        <p className="text-sm leading-relaxed text-[#B8C0CC]">
                          {t(`faq.items.${faqKeys[index]}.a`)}
                        </p>
                      </div>
                    </details>
                  </ScrollRevealSection>
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section
            id="contact"
            className="container mx-auto px-4 py-11 md:py-24"
          >
            <ScrollRevealSection>
              <div className="glass-card p-3 sm:p-5 md:p-8 lg:p-12 text-center relative overflow-hidden">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-sky-500/8 to-transparent rounded-full" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-gradient-to-tl from-violet-500/8 to-transparent rounded-full" />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-white/5">
                    <MessageCircle className="h-8 w-8 text-sky-400" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {t("contact.title")}
                  </h2>
                  <p className="mt-3 text-[#B8C0CC] max-w-md mx-auto">
                    Reach out for service, product, account, or payment support
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
                    <a
                      href={`tel:${support.phone}`}
                      className="glass-button-primary inline-flex h-12 items-center rounded-2xl px-6 text-base font-semibold text-sky-200 gap-2 hover:scale-105 transition-transform duration-300"
                    >
                      <Phone className="h-4 w-4" />
                      {t("common.callNow")}
                    </a>
                    <a
                      href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="glass-button inline-flex h-12 items-center rounded-2xl px-6 text-base font-semibold text-[#E5E7EB] gap-2 hover:scale-105 transition-transform duration-300"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t("common.whatsapp")}
                    </a>
                    <Link
                      href="/request-account"
                      className="glass-button inline-flex h-12 items-center rounded-2xl px-6 text-base font-semibold text-[#E5E7EB] gap-2 hover:scale-105 transition-transform duration-300"
                    >
                      {t("common.requestAccount")}
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollRevealSection>
          </section>
        </main>

        <FooterSection support={support} />
      </div>
    </ElectricalBackground>
  );
}
