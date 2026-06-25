"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, ShieldCheck, Truck, WalletCards, MessageCircle, Mail, IndianRupee, Wrench, Info } from "lucide-react";
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
  "electrical-product-sales": 5,
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

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card p-6 ${className}`}>{children}</div>;
}

export function AboutContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-11">
      <GlassCard>
        <h2 className="text-xl font-semibold text-white">{t("pages.about.heading")}</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#B8C0CC]">
          {aboutBulletKeys.map((key) => (
            <li key={key}>- {t(`pages.about.bullets.${key}`)}</li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}

export function ServicesGrid() {
  const { t } = useLandingLanguage();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((item, index) => (
        <PremiumCard key={item.slug}>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
            <item.icon className="h-5 w-5 text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            {t(`services.items.${serviceKeys[index]}.title`)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#B8C0CC]">
            {t(`services.items.${serviceKeys[index]}.shortDescription`)}
          </p>
          <Link
            href={`/services/${item.slug}`}
            className="mt-4 inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors"
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
    <section className="container mx-auto px-4 py-11 space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {productKeys.map((key) => (
          <PremiumCard key={key}>
            <h2 className="text-xl font-semibold text-white">
              {t(`pages.products.categories.${key}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#B8C0CC]">
              {t(`pages.products.categories.${key}.details`)}
            </p>
            <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-start gap-2 text-sm">
                <IndianRupee className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-sky-300 font-medium">{t("pages.pricing.productSaleTitle")}:</span>
                  <p className="text-[#B8C0CC] mt-0.5">{t(`pages.products.categories.${key}.pricing.salePrice`)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Wrench className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-violet-300 font-medium">{t("pages.pricing.productInstallTitle")}:</span>
                  <p className="text-[#B8C0CC] mt-0.5">{t(`pages.products.categories.${key}.pricing.installPrice`)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#B8C0CC]/70">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <p>{t(`pages.products.categories.${key}.pricing.labourNote`)}</p>
              </div>
            </div>
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

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">{t("pages.pricing.generalGuidance")}</h2>
        <ul className="mt-4 space-y-2 text-sm text-[#B8C0CC]">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex items-start gap-2">
              <CircleCheck className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
              <span>{t(`pages.pricing.guidancePoints.point${i}`)}</span>
            </li>
          ))}
        </ul>
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
    <GlassCard>
      <p className="flex items-center gap-2 text-sky-400">
        <Icon className="h-4 w-4" /> {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#B8C0CC]">{copy}</p>
    </GlassCard>
  );
}

export function PricingContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-11 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pricingHighlights.map((item, index) => (
          <PremiumCard key={item.title}>
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider text-sky-400/80">
              {t(`pricing.items.${pricingKeys[index]}.title`)}
            </h2>
            <p className="mt-2 text-xl font-bold text-gradient">
              {t(`pricing.items.${pricingKeys[index]}.price`)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#B8C0CC]">
              {t(`pricing.items.${pricingKeys[index]}.note`)}
            </p>
          </PremiumCard>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">{t("pages.pricing.servicePricingTitle")}</h2>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.pricing.servicePricingCopy")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["inspection", "homeService", "wiringFitting", "emergency"] as const).map((key) => (
            <div key={key} className="glass rounded-xl p-4">
              <p className="text-sm font-semibold text-white">{t(`pages.pricing.${key}.title`)}</p>
              <p className="mt-1 text-lg font-bold text-gradient">{t(`pages.pricing.${key}.price`)}</p>
              <p className="mt-1 text-xs text-[#B8C0CC]">{t(`pages.pricing.${key}.note`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">{t("pages.pricing.productSaleTitle")}</h2>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.pricing.productSaleCopy")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productKeys.map((key) => (
            <div key={key} className="glass rounded-xl p-3">
              <p className="text-sm font-medium text-white">{t(`pages.products.categories.${key}.title`)}</p>
              <p className="mt-1 text-xs text-sky-400">{t(`pages.products.categories.${key}.pricing.salePrice`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">{t("pages.pricing.productInstallTitle")}</h2>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.pricing.productInstallCopy")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productKeys.map((key) => (
            <div key={key} className="glass rounded-xl p-3">
              <p className="text-sm font-medium text-white">{t(`pages.products.categories.${key}.title`)}</p>
              <p className="mt-1 text-xs text-violet-400">{t(`pages.products.categories.${key}.pricing.installPrice`)}</p>
              <p className="mt-1 text-xs text-[#B8C0CC]/70">{t(`pages.products.categories.${key}.pricing.labourNote`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">{t("pages.pricing.labourGuidance")}</h2>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.pricing.labourGuidanceNote")}</p>
        <div className="mt-4 space-y-2 text-sm text-[#B8C0CC]">
          {[1, 2, 3, 4, 5].map((i) => (
            <p key={i} className="flex items-start gap-2">
              <CircleCheck className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
              <span>{t(`pages.pricing.guidancePoints.point${i}`)}</span>
            </p>
          ))}
        </div>
      </div>

      <p className="text-sm text-[#B8C0CC]/60">
        {t("pages.pricing.finalNote")}
      </p>
    </section>
  );
}

export function RentToolsContent() {
  const { t } = useLandingLanguage();
  const support = getSupportContact();

  return (
    <section className="container mx-auto px-4 py-11">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
              <CircleCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {t("pages.rentTools.loginTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#B8C0CC]">
                {t("pages.rentTools.copy")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-[#B8C0CC]">
            <p className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <span>{t("pages.rentTools.accountPoint")}</span>
            </p>
            <p className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span>{t("pages.rentTools.requestPoint")}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="glass-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-sky-200"
            >
              <CircleCheck className="h-4 w-4" />
              {t("common.login")}
            </Link>
            <a
              href="#rent-tools-account-request"
              className="glass-button inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-[#E5E7EB]"
            >
              <CircleCheck className="h-4 w-4" />
              {t("common.requestAccount")}
            </a>
          </div>

          <div className="mt-8 border-t border-white/5 pt-5">
            <h3 className="text-sm font-semibold text-white">
              {t("pages.rentTools.pricingTitle")}
            </h3>
            <p className="mt-3 text-sky-400">{t("pages.rentTools.hourly")}</p>
            <p className="text-violet-400">{t("pages.rentTools.daily")}</p>
            <p className="mt-4 text-sm leading-6 text-[#B8C0CC]">
              {t("pages.rentTools.rateCopy")}
            </p>
          </div>
        </GlassCard>

        <div id="rent-tools-account-request" className="scroll-mt-24">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {t("pages.rentTools.requestTitle")}
          </h2>
          <div className="glass-card p-6">
            <RequestAccountForm
              support={{ email: support.email, whatsapp: support.whatsapp }}
              compact
            />
          </div>
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", channel: "whatsapp" as "whatsapp" | "email" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.message.trim()) {
      setError(t("form.validationRequired"));
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setError(t("validation.phoneInvalid"));
      return;
    }
    if (!/^[6-9]/.test(phoneDigits)) {
      setError(t("validation.phoneStart"));
      return;
    }

    const summary = `${t("pages.contact.formTitle")}\n${t("form.summaryName")}: ${form.name}\n${t("form.summaryPhone")}: ${form.phone}\n${t("form.summaryEmail")}: ${form.email}\n${t("pages.contact.messagePlaceholder")}: ${form.message}`;

    setIsLoading(true);
    try {
      if (form.channel === "whatsapp") {
        const encoded = encodeURIComponent(summary);
        const phone = support.whatsapp.replace(/\D/g, "");
        const waLink = phone
          ? `https://wa.me/${phone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`;
        window.open(waLink, "_blank");
        setForm({ name: "", phone: "", email: "", message: "", channel: "whatsapp" });
      } else {
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: support.email,
            subject: t("pages.contact.formTitle"),
            text: summary,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || t("form.channelError"));
        } else {
          setSuccess(t("form.emailSuccess"));
          setForm({ name: "", phone: "", email: "", message: "", channel: "whatsapp" });
        }
      }
    } catch {
      setError(t("form.channelError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="container mx-auto grid gap-4 px-4 py-11 lg:grid-cols-2">
      <GlassCard>
        <p className="text-sm leading-6 text-[#B8C0CC]">{t("pages.contact.phone")}: {support.phone}</p>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.contact.whatsapp")}: {support.whatsapp}</p>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.contact.email")}: {support.email}</p>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.contact.address")}: {t("pages.contact.addressValue")}</p>
        <p className="mt-2 text-sm text-[#B8C0CC]">{t("pages.contact.workingHours")}: {t("pages.contact.workingHoursValue")}</p>
        <div className="mt-4 flex gap-2">
          <a href={`tel:${support.phone}`} className="glass-button-primary rounded-2xl px-4 py-2 text-sm font-semibold text-sky-200 inline-flex items-center gap-2">
            {t("common.callNow")}
          </a>
          <a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="glass-button rounded-2xl px-4 py-2 text-sm font-semibold text-[#E5E7EB] inline-flex items-center gap-2">
            {t("common.whatsapp")}
          </a>
        </div>
      </GlassCard>
      <GlassCard>
        <h2 className="text-lg font-semibold text-white">{t("pages.contact.formTitle")}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#B8C0CC]/50"
            placeholder={t("pages.contact.namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#B8C0CC]/50"
            type="text"
            inputMode="numeric"
            placeholder={t("pages.contact.phonePlaceholder")}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            required
          />
          <input
            type="email"
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#B8C0CC]/50"
            placeholder={t("pages.contact.emailPlaceholder")}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <textarea
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#B8C0CC]/50 resize-none"
            rows={5}
            placeholder={t("pages.contact.messagePlaceholder")}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, channel: "whatsapp" }))}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.channel === "whatsapp"
                  ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                  : "border-white/10 text-[#B8C0CC] hover:text-white"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, channel: "email" }))}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.channel === "email"
                  ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                  : "border-white/10 text-[#B8C0CC] hover:text-white"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400 bg-green-950/40 rounded-lg px-3 py-2 border border-green-500/20">{success}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="glass-button-primary rounded-2xl px-5 py-2.5 text-sm font-semibold text-sky-200 disabled:opacity-50"
          >
            {isLoading
              ? t("form.submitting")
              : form.channel === "whatsapp"
                ? <><MessageCircle className="mr-2 h-4 w-4 inline" />{t("form.sendWhatsapp")}</>
                : <><Mail className="mr-2 h-4 w-4 inline" />{t("form.sendEmail")}</>}
          </button>
        </form>
      </GlassCard>
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
    <section className="container mx-auto px-4 py-6 md:py-11">
      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="xl:col-span-2">
          <h2 className="text-2xl font-semibold text-white">
            {t("pages.serviceDetail.includedTitle")}
          </h2>
          {hasExtra ? <p className="mt-3 text-base leading-7 text-[#B8C0CC]">{extraSummary}</p> : null}

          <ul className="mt-5 space-y-2 text-base text-[#B8C0CC]">
            {Array.from({ length: includesCount }, (_, index) => (
              <li key={index} className="flex items-start gap-2">
                <CircleCheck className="mt-0.5 h-4 w-4 text-sky-400" />
                <span>{t(`pages.serviceDetail.includes.${serviceSlug}.item${index + 1}`)}</span>
              </li>
            ))}
          </ul>

          {extraPointCount ? (
            <div className="mt-6 glass rounded-xl p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                {t("pages.serviceDetail.clarificationTitle")}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B8C0CC]">
                {Array.from({ length: extraPointCount }, (_, index) => (
                  <li key={index}>- {t(`pages.serviceDetail.extra.${serviceSlug}.point${index + 1}`)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-lg font-semibold text-white">
              {t("pages.serviceDetail.needTitle")}
            </h3>
            <div className="mt-4 space-y-2">
              <a href="https://wa.me/917015493276" className="glass-button-primary block rounded-2xl px-4 py-2.5 text-center text-sm font-semibold text-sky-200">
                {t("common.whatsapp")}
              </a>
              <Link href="/request-account" className="glass-button block rounded-2xl px-4 py-2.5 text-center text-sm font-semibold text-[#E5E7EB]">
                {t("pages.serviceDetail.requestService")}
              </Link>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-semibold text-white">
              {t("pages.serviceDetail.chargeTitle")}
            </h3>
            <div className="mt-4 grid gap-3 text-sm">
              <ServiceChargeCard icon={WalletCards} title={t("pages.serviceDetail.visitingChargeTitle")} copy={t("pages.serviceDetail.visitingChargeCopy")} />
              <ServiceChargeCard icon={ShieldCheck} title={t("pages.serviceDetail.emergencyTitle")} copy={t("pages.serviceDetail.emergencyCopy")} />
              <ServiceChargeCard icon={CircleCheck} title={t("pages.serviceDetail.finalAmountTitle")} copy={t("pages.serviceDetail.finalAmountCopy")} />
            </div>
            <p className="mt-4 text-xs text-[#B8C0CC]/60">
              {t("pages.serviceDetail.policyNote")}
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              {t("common.viewDetails")} → {t("nav.pricing")}
            </Link>
          </GlassCard>
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
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 text-sky-400">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-1 leading-6 text-[#B8C0CC]">{copy}</p>
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
    <section className="container mx-auto px-4 py-11">
      <GlassCard>
        <ul className="space-y-3 text-sm leading-6 text-[#B8C0CC]">
          {Array.from({ length: count }, (_, index) => (
            <li key={index}>- {t(`pages.${page}.points.item${index + 1}`)}</li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}

export function TermsContent() {
  const { t } = useLandingLanguage();

  return (
    <section className="container mx-auto px-4 py-11">
      <div className="space-y-6">
        {termsPointCounts.map((count, sectionIndex) => (
          <article key={sectionIndex} className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white">
              {t(`pages.terms.sections.section${sectionIndex + 1}.title`)}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B8C0CC]">
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
