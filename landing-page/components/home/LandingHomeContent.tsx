"use client";

import Header from "@landing/components/home/Header";
import {
  FooterSection,
  HeroSection,
  PremiumCard,
  SectionTitle,
} from "@landing/components/shared/landing-sections";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import {
  faqs,
  pricingHighlights,
  processSteps,
  services,
  whyChooseUs,
} from "@landing/lib/site-data";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

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

export default function LandingHomeContent({
  support,
}: {
  support: LandingSupport;
}) {
  const { t } = useLandingLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection
          support={{ phone: support.phone, whatsapp: support.whatsapp }}
        />

        <section id="services" className="container mx-auto px-4 py-14 md:py-16">
          <SectionTitle
            eyebrow={t("services.eyebrow")}
            title={t("services.title")}
            copy={t("services.copy")}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((item, index) => (
              <PremiumCard key={item.slug}>
                <item.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-3 text-lg font-semibold text-foreground">
                  {t(`services.items.${serviceKeys[index]}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`services.items.${serviceKeys[index]}.shortDescription`)}
                </p>
                <Link
                  href={`/services/${item.slug}`}
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t("common.viewDetails")}{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section id="about" className="border-y border-border bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle
              eyebrow={t("why.eyebrow")}
              title={t("why.title")}
              copy={t("why.copy")}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {whyChooseUs.map((item) => (
                <PremiumCard key={item.title}>
                  <item.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
                </PremiumCard>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-16">
          <SectionTitle
            eyebrow={t("process.eyebrow")}
            title={t("process.title")}
          />
          <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className={`rounded-lg border border-border bg-card p-5 text-card-foreground ${
                  index === 4
                    ? "sm:col-span-2 lg:col-span-2"
                    : "lg:col-span-2"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {t("common.step")} {index + 1}
                </p>
                <p className="mt-2 text-lg leading-snug">
                  {t(`process.steps.${processKeys[index]}`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle
              eyebrow={t("pricing.eyebrow")}
              title={t("pricing.title")}
              copy={t("pricing.copy")}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pricingHighlights.map((item, index) => (
                <PremiumCard key={item.title}>
                  <h3 className="font-semibold text-foreground">
                    {t(`pricing.items.${pricingKeys[index]}.title`)}
                  </h3>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {t(`pricing.items.${pricingKeys[index]}.price`)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(`pricing.items.${pricingKeys[index]}.note`)}
                  </p>
                </PremiumCard>
              ))}
            </div>
          </div>
        </section>

        <section id="rent-tools" className="container mx-auto px-4 py-14 md:py-16">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground">
              {t("rentTools.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t("rentTools.copy")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
                {t("rentTools.hourly")}
              </span>
              <span className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
                {t("rentTools.daily")}
              </span>
            </div>
            <Link
              href="/rent-tools"
              className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("rentTools.cta")}
            </Link>
          </div>
        </section>

        <section id="request" className="border-y border-border bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle
              eyebrow={t("account.eyebrow")}
              title={t("account.title")}
              copy={t("account.copy")}
            />
            <div className="mx-auto mt-8 max-w-4xl">
              <RequestAccountForm
                support={{ email: support.email, whatsapp: support.whatsapp }}
                compact
              />
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
            <div className="mx-auto mt-8 max-w-4xl space-y-3">
              {faqs.map((faq, index) => (
                <details
                  key={faq.q}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <summary className="cursor-pointer text-base font-medium text-foreground">
                    {t(`faq.items.${faqKeys[index]}.q`)}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`faq.items.${faqKeys[index]}.a`)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="container mx-auto px-4 py-14 md:py-16">
          <div className="rounded-2xl border border-border bg-card p-6 text-center md:p-8">
            <h2 className="text-2xl font-bold text-foreground">
              {t("contact.title")}
            </h2>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href={`tel:${support.phone}`}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Phone className="mr-2 h-4 w-4" />
                {t("common.callNow")}
              </a>
              <a
                href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`}
                className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("common.whatsapp")}
              </a>
              <Link
                href="/request-account"
                className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t("common.requestAccount")}
              </Link>
            </div>
          </div>
        </section>

        <FooterSection support={support} />
      </main>
    </div>
  );
}
