import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { services } from "@landing/lib/site-data";
import { CircleCheck, ShieldCheck, WalletCards } from "lucide-react";

const serviceExtraDetails: Record<string, { summary: string; points: string[] }> = {
  "home-electrical-services": {
    summary: "Reliable home visits for electrical repair, fitting, and appliance-related checks.",
    points: [
      "We support common home appliances like washing machine, cooler, and refrigerator electrical faults.",
      "All work is done after basic safety inspection and issue discussion.",
      "Service scope and expected charges are explained before starting work whenever possible.",
    ],
  },
  "appliance-repair": {
    summary: "Practical electrical diagnostics for household appliances and connected points.",
    points: [
      "Diagnosis includes supply line, load behavior, and component-level symptom checks.",
      "Repair recommendation is shared before part replacement or extra work.",
    ],
  },
  "new-wiring-fitting": {
    summary: "Planning-to-execution wiring support with safety-first implementation.",
    points: [
      "Material and load discussion is done before estimate finalization.",
      "Extra concealed issues, if found, are discussed before continuing.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) return { title: "Service" };
  return { title: service.title, description: service.shortDescription };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) notFound();

  const extra = serviceExtraDetails[service.slug];

  return (
    <LandingShell title={service.title} copy={service.shortDescription}>
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-semibold text-white">What Is Included</h2>
            {extra?.summary ? <p className="mt-3 text-base text-slate-300">{extra.summary}</p> : null}

            <ul className="mt-5 space-y-2 text-base text-slate-200">
              {service.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-sky-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {extra?.points?.length ? (
              <div className="mt-6 rounded-lg border border-slate-700/80 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">Service Clarification</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {extra.points.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold text-white">Need This Service?</h3>
              <div className="mt-4 space-y-2">
                <a href="https://wa.me/917015493276" className="block rounded-md bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400">WhatsApp</a>
                <Link href="/request-account" className="block rounded-md border border-slate-600 px-4 py-2 text-center text-sm text-white hover:bg-slate-800">Request Service</Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold text-white">Charge Clarification</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-2 text-sky-300"><WalletCards className="h-4 w-4" /> Visiting Charge</div>
                  <p className="mt-1 text-slate-300">Fixed visit charge: <span className="font-semibold text-white">₹200 per visit</span> (within standard service area).</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-2 text-sky-300"><ShieldCheck className="h-4 w-4" /> Emergency Timing</div>
                  <p className="mt-1 text-slate-300">After 8:00 PM, emergency/late-night service can be 2x-3x based on risk and availability.</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-2 text-sky-300"><CircleCheck className="h-4 w-4" /> Final Amount</div>
                  <p className="mt-1 text-slate-300">Final total depends on work scope, location, materials, and any additional faults found during inspection.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">This pricing policy is also defined in our Terms & Conditions.</p>
            </div>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
