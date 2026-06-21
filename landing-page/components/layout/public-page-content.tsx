"use client";

import Link from "next/link";
import { CircleCheck, ShieldCheck, Truck, WalletCards } from "lucide-react";
import { pricingHighlights, services } from "@landing/lib/site-data";
import { PremiumCard } from "@landing/components/shared/landing-sections";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import { getSupportContact } from "@/lib/auth-service";

const serviceKeys = [
  "electrical-product-sales",
  "home-electrical-services",
  "new-wiring-fitting",
  "appliance-repair",
  "fault-detection",
  "tool-rental",
  "maintenance-support",
  "emergency-support",
];

const pricingKeys = ["inspection", "homeService", "wiring", "emergency"];

const aboutBulletKeys = ["mission", "trust", "safety", "local"];

const productKeys = [
  "switches",
  "sockets",
  "wires",
  "lights",
  "mcb",
  "boards",
  "accessories",
];

const serviceExtraPointCount: Record<string, number> = {
  "home-electrical-services": 3,
  "appliance-repair": 2,
  "new-wiring-fitting": 2,
};

const simplePolicyCounts = {
  privacy: 6,
  refund: 6,
  helpPayment: 6,
} as const;

const termsPointCounts = [5, 5, 5, 5, 4, 5, 6, 4, 3, 3, 4, 2];

export function AboutContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("pages.about.heading")}</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          {aboutBulletKeys.map((key) => (
            <li key={key}>- {t(`pages.about.bullets.${key}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ServicesGrid() {
  const { t } = useLandingLanguage();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((item, index) => (
        <PremiumCard key={item.slug}>
          <item.icon className="h-7 w-7 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">
            {t(`services.items.${serviceKeys[index]}.title`)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(`services.items.${serviceKeys[index]}.shortDescription`)}
          </p>
          <Link
            href={`/services/${item.slug}`}
            className="mt-4 inline-block text-sm text-primary"
          >
            {t("common.viewDetails")}
          </Link>
        </PremiumCard>
      ))}
    </div>
  );
}

export function ProductsContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productKeys.map((key) => (
          <PremiumCard key={key}>
            <h2 className="text-xl font-semibold text-foreground">
              {t(`pages.products.categories.${key}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(`pages.products.categories.${key}.details`)}
            </p>
          </PremiumCard>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ProductGuidanceCard
          icon={CircleCheck}
          title={t("pages.products.guidance.qualityTitle")}
          copy={t("pages.products.guidance.qualityCopy")}
        />
        <ProductGuidanceCard
          icon={ShieldCheck}
          title={t("pages.products.guidance.warrantyTitle")}
          copy={t("pages.products.guidance.warrantyCopy")}
        />
        <ProductGuidanceCard
          icon={Truck}
          title={t("pages.products.guidance.fitmentTitle")}
          copy={t("pages.products.guidance.fitmentCopy")}
        />
      </div>
    </section>
  );
}

function ProductGuidanceCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof CircleCheck;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" /> {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

export function PricingContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto grid gap-4 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
      {pricingHighlights.map((item, index) => (
        <PremiumCard key={item.title}>
          <h2 className="font-semibold text-foreground">
            {t(`pricing.items.${pricingKeys[index]}.title`)}
          </h2>
          <p className="mt-2 text-xl font-bold text-primary">
            {t(`pricing.items.${pricingKeys[index]}.price`)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t(`pricing.items.${pricingKeys[index]}.note`)}
          </p>
        </PremiumCard>
      ))}
      <p className="text-sm leading-6 text-muted-foreground md:col-span-2 lg:col-span-4">
        {t("pages.pricing.finalNote")}
      </p>
    </section>
  );
}

export function RentToolsContent() {
  const { t } = useLandingLanguage();
  const support = getSupportContact();

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
              <CircleCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {t("pages.rentTools.loginTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t("pages.rentTools.copy")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t("pages.rentTools.accountPoint")}</span>
            </p>
            <p className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t("pages.rentTools.requestPoint")}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <CircleCheck className="h-4 w-4" />
              {t("common.login")}
            </Link>
            <a
              href="#rent-tools-account-request"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <CircleCheck className="h-4 w-4" />
              {t("common.requestAccount")}
            </a>
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              {t("pages.rentTools.pricingTitle")}
            </h3>
            <p className="mt-3 text-primary">{t("pages.rentTools.hourly")}</p>
            <p className="text-primary">{t("pages.rentTools.daily")}</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {t("pages.rentTools.rateCopy")}
            </p>
          </div>
        </div>

        <div id="rent-tools-account-request" className="scroll-mt-24">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t("pages.rentTools.requestTitle")}
          </h2>
          <RequestAccountForm
            support={{ email: support.email, whatsapp: support.whatsapp }}
            compact
          />
        </div>
      </div>
    </section>
  );
}

export function ContactContent({
  support,
}: {
  support: { phone: string; whatsapp: string; email: string };
}) {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto grid gap-4 px-4 py-12 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-6 text-sm leading-6 text-muted-foreground">
        <p>{t("pages.contact.phone")}: {support.phone}</p>
        <p className="mt-2">{t("pages.contact.whatsapp")}: {support.whatsapp}</p>
        <p className="mt-2">{t("pages.contact.email")}: {support.email}</p>
        <p className="mt-2">{t("pages.contact.address")}: {t("pages.contact.addressValue")}</p>
        <p className="mt-2">{t("pages.contact.workingHours")}: {t("pages.contact.workingHoursValue")}</p>
        <div className="mt-4 flex gap-2">
          <a href={`tel:${support.phone}`} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            {t("common.callNow")}
          </a>
          <a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            {t("common.whatsapp")}
          </a>
        </div>
      </div>
      <form className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">{t("pages.contact.formTitle")}</h2>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder={t("pages.contact.namePlaceholder")} />
          <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder={t("pages.contact.phonePlaceholder")} />
          <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" rows={5} placeholder={t("pages.contact.messagePlaceholder")} />
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            {t("pages.contact.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ServiceDetailContent({
  serviceSlug,
  includesCount,
}: {
  serviceSlug: string;
  includesCount: number;
}) {
  const { t } = useLandingLanguage();
  const extraPointCount = serviceExtraPointCount[serviceSlug] ?? 0;
  const extraSummary = t(`pages.serviceDetail.extra.${serviceSlug}.summary`);
  const hasExtra = !extraSummary.startsWith("pages.");

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 xl:col-span-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {t("pages.serviceDetail.includedTitle")}
          </h2>
          {hasExtra ? <p className="mt-3 text-base leading-7 text-muted-foreground">{extraSummary}</p> : null}

          <ul className="mt-5 space-y-2 text-base text-muted-foreground">
            {Array.from({ length: includesCount }, (_, index) => (
              <li key={index} className="flex items-start gap-2">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>{t(`pages.serviceDetail.includes.${serviceSlug}.item${index + 1}`)}</span>
              </li>
            ))}
          </ul>

          {extraPointCount ? (
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {t("pages.serviceDetail.clarificationTitle")}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {Array.from({ length: extraPointCount }, (_, index) => (
                  <li key={index}>- {t(`pages.serviceDetail.extra.${serviceSlug}.point${index + 1}`)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t("pages.serviceDetail.needTitle")}
            </h3>
            <div className="mt-4 space-y-2">
              <a href="https://wa.me/917015493276" className="block rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                {t("common.whatsapp")}
              </a>
              <Link href="/request-account" className="block rounded-md border border-border px-4 py-2 text-center text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                {t("pages.serviceDetail.requestService")}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t("pages.serviceDetail.chargeTitle")}
            </h3>
            <div className="mt-4 grid gap-3 text-sm">
              <ServiceChargeCard icon={WalletCards} title={t("pages.serviceDetail.visitingChargeTitle")} copy={t("pages.serviceDetail.visitingChargeCopy")} />
              <ServiceChargeCard icon={ShieldCheck} title={t("pages.serviceDetail.emergencyTitle")} copy={t("pages.serviceDetail.emergencyCopy")} />
              <ServiceChargeCard icon={CircleCheck} title={t("pages.serviceDetail.finalAmountTitle")} copy={t("pages.serviceDetail.finalAmountCopy")} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("pages.serviceDetail.policyNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceChargeCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof CircleCheck;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-1 leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

export function SimplePolicyContent({
  page,
}: {
  page: keyof typeof simplePolicyCounts;
}) {
  const { t } = useLandingLanguage();
  const count = simplePolicyCounts[page];

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6">
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          {Array.from({ length: count }, (_, index) => (
            <li key={index}>- {t(`pages.${page}.points.item${index + 1}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TermsContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="space-y-6">
        {termsPointCounts.map((count, sectionIndex) => (
          <article
            key={sectionIndex}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-lg font-semibold text-foreground">
              {t(`pages.terms.sections.section${sectionIndex + 1}.title`)}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {Array.from({ length: count }, (_, pointIndex) => (
                <li key={pointIndex}>
                  -{" "}
                  {t(
                    `pages.terms.sections.section${sectionIndex + 1}.points.item${pointIndex + 1}`,
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
