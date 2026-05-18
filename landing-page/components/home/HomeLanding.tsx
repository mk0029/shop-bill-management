import { getSupportContact } from "@/lib/auth-service";
import Header from "@landing/components/home/Header";
import { HeroSection, SectionTitle, PremiumCard, FooterSection } from "@landing/components/shared/landing-sections";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import { faqs, pricingHighlights, processSteps, services, whyChooseUs } from "@landing/lib/site-data";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";

export default function HomeLanding() {
  const support = getSupportContact();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white">
        <HeroSection support={{ phone: support.phone, whatsapp: support.whatsapp }} />

        <section id="services" className="container mx-auto px-4 py-14 md:py-16">
          <SectionTitle eyebrow="Services" title="Complete Electrical Services" copy="Clear service options for products, repair, wiring, and rental." />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((item) => (
              <PremiumCard key={item.slug}>
                <item.icon className="h-7 w-7 text-sky-300" />
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.shortDescription}</p>
                <Link href={`/services/${item.slug}`} className="mt-4 inline-flex items-center text-sm font-medium text-sky-300 hover:text-sky-200">View Details <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section id="about" className="border-y border-slate-800 bg-slate-900/35 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle eyebrow="Why Choose Us" title="Local Team You Can Trust" copy="Professional process, clear communication, and safety-first work." />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {whyChooseUs.map((item) => (
                <PremiumCard key={item.title}>
                  <item.icon className="h-6 w-6 text-sky-300" />
                  <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.copy}</p>
                </PremiumCard>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-16">
          <SectionTitle eyebrow="How We Work" title="Simple 5-Step Process" />
          <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className={`rounded-lg border border-slate-700 bg-slate-900/70 p-5 text-slate-100 ${
                  index === 4 ? "sm:col-span-2 lg:col-span-2" : "lg:col-span-2"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">Step {index + 1}</p>
                <p className="mt-2 text-lg leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-800 bg-slate-900/35 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle eyebrow="Pricing" title="Transparent Rate Highlights" copy="Final price depends on work, location, material, and timing." />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pricingHighlights.map((item) => (
                <PremiumCard key={item.title}>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-2xl font-bold text-sky-300">{item.price}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.note}</p>
                </PremiumCard>
              ))}
            </div>
          </div>
        </section>

        <section id="rent-tools" className="container mx-auto px-4 py-14 md:py-16">
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-sky-950/35 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white">Need Electrical Tools on Rent?</h2>
            <p className="mt-2 max-w-2xl text-slate-300">Hourly and daily rental with advance payment. Return tools in proper condition to avoid damage/loss charges.</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white">₹100/hour</span>
              <span className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white">₹500/day</span>
            </div>
            <Link href="/rent-tools" className="mt-5 inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">Request Tool on Rent</Link>
          </div>
        </section>

        <section id="request" className="border-y border-slate-800 bg-slate-900/35 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle eyebrow="Customer Account" title="Request Account in Minutes" copy="Share basic details and we will connect for confirmation." />
            <div className="mx-auto mt-8 max-w-4xl"><RequestAccountForm support={{ email: support.email, whatsapp: support.whatsapp }} compact /></div>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/35 py-14 md:py-16">
          <div className="container mx-auto px-4">
            <SectionTitle eyebrow="FAQ" title="Common Questions" />
            <div className="mx-auto mt-8 max-w-4xl space-y-3">
              {faqs.map((faq) => (
                <details key={faq.q} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <summary className="cursor-pointer text-base font-medium text-white">{faq.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="container mx-auto px-4 py-14 md:py-16">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-center md:p-8">
            <h2 className="text-2xl font-bold text-white">Need electrical help today?</h2>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a href={`tel:${support.phone}`} className="inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"><Phone className="mr-2 h-4 w-4" />Call Now</a>
              <a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="inline-flex items-center rounded-md border border-sky-500 px-4 py-2 text-sm text-sky-300 hover:bg-sky-950/40"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a>
              <Link href="/request-account" className="inline-flex items-center rounded-md border border-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-800">Request Account</Link>
            </div>
          </div>
        </section>

        <FooterSection support={support} />
      </main>
    </>
  );
}
