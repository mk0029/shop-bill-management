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
  Sparkles,
  ChevronDown,
  Star,
  Bolt,
  ShieldCheck,
  Clock,
  Zap,
  ArrowUpFromLine,
  X,
  Construction,
} from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

function FaqAccordion({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      setMaxH(isOpen ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isOpen]);

  return (
    <div className="glass-card transition-all duration-300">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
      >
        <span className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors shrink-0",
              isOpen ? "bg-sky-400" : "bg-sky-400/60",
            )}
          />
          <span className="text-base font-medium text-white">{question}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-sky-400/60 transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: maxH }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          <div className="ml-4 pl-4 border-l border-white/5">
            <p className="text-sm leading-relaxed text-[#B8C0CC]">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-14 h-8 rounded-t-full bg-white/10 backdrop-blur-xl border-t border-l border-r border-white/10 flex items-start justify-center pt-1.5 text-white/70 hover:text-white hover:bg-white/20 hover:border-white/20 transition-all duration-300 group ${
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-9 opacity-0 pointer-events-none"
      }`}
    >
      <ArrowUpFromLine className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 duration-200" />
    </button>
  );
}

function UnderDevelopmentNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("shop_under_dev_notice_seen");
    if (dismissed === "1") return;
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem("shop_under_dev_notice_seen", "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div className="relative glass-card max-w-lg w-full p-5 sm:p-6 animate-scale-in overflow-hidden">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-sky-400/20">
          <Construction className="h-7 w-7 text-sky-400" />
        </div>

        {/* EN */}
        <div>
          <h3 className="text-base font-bold text-white">
            Site Under Development
          </h3>
          <p className="mt-2 text-sm text-[#B8C0CC] leading-relaxed">
            This site is currently under development and some features are being
            built. If you face any issues while filling forms, navigating pages,
            or if any UI section is not working correctly, please notify us with
            a screenshot or media of that part so we can fix it as soon as
            possible.
          </p>
        </div>

        {/* HI */}
        <div className="mt-4">
          <h3 className="text-base font-bold text-white">साइट विकासाधीन है</h3>
          <p className="mt-2 text-sm text-[#B8C0CC] leading-relaxed">
            यह साइट वर्तमान में विकास के अंतर्गत है और कुछ सुविधाएँ बनाई जा रही
            हैं। यदि आपको फ़ॉर्म भरने, पेजों पर जाने, या किसी UI भाग में समस्या
            आती है, तो कृपया उस भाग का स्क्रीनशॉट या मीडिया संलग्न करके हमें
            सूचित करें ताकि हम इसे जल्द से जल्द ठीक कर सकें।
          </p>
        </div>

        <p className="mt-4 text-xs text-white/30 italic text-center">
          Tap outside or press ✕ to dismiss &nbsp;|&nbsp; बाहर टैप करें या ✕
          दबाएं
        </p>
      </div>
    </div>
  );
}

export default function LandingHomeContent({
  support,
}: {
  support: LandingSupport;
}) {
  const { t } = useLandingLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <ElectricalBackground>
      <div className="h-[var(--app-vh,100dvh)] text-[#E5E7EB]">
        <Header />
        <main>
          <HeroSection
            support={{ phone: support.phone, whatsapp: support.whatsapp }}
          />

          <section className="container mx-auto px-4 -mt-6 md:-mt-8 relative z-20 max-sm:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              <StatBadge label={t("stats.happyCustomers")} value="500+" />
              <StatBadge label={t("stats.servicesDone")} value="1.2K+" />
              <StatBadge label={t("stats.yearsTrusted")} value="8+" />
              <StatBadge label={t("stats.toolsAvailable")} value="40+" />
            </div>
          </section>

          <GlassDivider />

          <section
            id="services"
            className="container mx-auto px-4 py-8 md:py-24"
          >
            <ScrollRevealSection>
              <SectionTitle
                eyebrow={t("services.eyebrow")}
                title={t("services.title")}
                copy={t("services.copy")}
              />
            </ScrollRevealSection>
            <div className="mt-6 md:mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 6).map((item, index) => (
                <ScrollRevealSection key={item.slug}>
                  <PremiumCard>
                    <div className="flex items-start gap-4 mb-4 max-sm:flex-col max-sm:items-center max-sm:text-center">
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
                        <div className="flex items-center gap-1.5 mt-1.5 max-sm:justify-center">
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
                        <span>{t("services.availableNow")}</span>
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

          <section id="about" className="py-8 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("why.eyebrow")}
                  title={t("why.title")}
                  copy={t("why.copy")}
                />
              </ScrollRevealSection>
              <div className="mt-6 md:mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {whyChooseUs.map((item, idx) => (
                  <ScrollRevealSection key={item.title}>
                    <PremiumCard>
                      <div className="flex items-center gap-3 mb-4 max-sm:flex-col max-sm:text-center">
                        <IconBox variant="secondary">
                          <item.icon className="h-5 w-5" />
                        </IconBox>
                        <h3 className="text-base font-semibold text-white flex-1">
                          {t(`why.items.${whyKeys[idx]}.title`)}
                        </h3>
                      </div>
                      <p className="text-sm text-[#B8C0CC] leading-relaxed pl-1">
                        {t(`why.items.${whyKeys[idx]}.copy`)}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-[#B8C0CC]/50">
                        <Sparkles className="h-3 w-3 text-sky-400/60" />
                        <span>{t("services.trustedByLocals")}</span>
                      </div>
                    </PremiumCard>
                  </ScrollRevealSection>
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section className="container mx-auto px-4 py-8 md:py-24">
            <ScrollRevealSection>
              <SectionTitle
                eyebrow={t("process.eyebrow")}
                title={t("process.title")}
              />
            </ScrollRevealSection>
            <div className="mx-auto mt-6 md:mt-10 max-w-6xl relative">
              <div className="absolute top-12 left-8 right-8 h-px bg-gradient-to-r from-sky-500/20 via-violet-500/20 to-transparent hidden lg:block" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {processSteps.map((step, index) => (
                  <ScrollRevealSection key={step}>
                    <div className="glass-card p-4 text-center group relative h-full">
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

          <section id="pricing" className="py-8 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("pricing.eyebrow")}
                  title={t("pricing.title")}
                  copy={t("pricing.copy")}
                />
              </ScrollRevealSection>
              <div className="mt-6 md:mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {pricingHighlights.map((item, index) => (
                  <ScrollRevealSection key={item.title}>
                    <PremiumCard>
                      <div className="flex items-center gap-2 mb-4 max-sm:flex-col max-sm:text-center">
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
                        <span>{t("services.noHiddenCharges")}</span>
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
            className="container mx-auto px-4 py-8 md:py-24"
          >
            <ScrollRevealSection>
              <div className="glass-card p-4 sm:p-5 md:p-10 relative overflow-hidden">
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
                        {t("services.flexibleRental")}
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

          <section id="request" className="py-8 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("account.eyebrow")}
                  title={t("account.title")}
                  copy={t("account.copy")}
                />
              </ScrollRevealSection>
              <div className="mx-auto mt-6 md:mt-10 max-w-4xl">
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

          <section className="py-8 md:py-24">
            <div className="container mx-auto px-4">
              <ScrollRevealSection>
                <SectionTitle
                  eyebrow={t("faq.eyebrow")}
                  title={t("faq.title")}
                />
              </ScrollRevealSection>
              <div className="mx-auto mt-6 md:mt-10 max-w-4xl space-y-4">
                {faqs.map((faq, index) => (
                  <FaqAccordion
                    key={faq.q}
                    question={t(`faq.items.${faqKeys[index]}.q`)}
                    answer={t(`faq.items.${faqKeys[index]}.a`)}
                    isOpen={openFaqIndex === index}
                    onToggle={() =>
                      setOpenFaqIndex(openFaqIndex === index ? null : index)
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          <GlassDivider />

          <section
            id="contact"
            className="container mx-auto px-4 py-8 md:py-24"
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
                    {t("contact.copy")}
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
                      rel="noopener noreferrer"
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
      <BackToTopButton />
      <UnderDevelopmentNotice />
    </ElectricalBackground>
  );
}
