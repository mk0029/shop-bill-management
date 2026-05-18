import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { pricingHighlights } from "@landing/lib/site-data";

export const metadata: Metadata = { title: "Pricing", description: "Transparent service pricing highlights for Jambh Electrics." };

export default function PricingPage() {
  return <LandingShell title="Transparent Pricing" copy="Exact price is confirmed before work whenever possible."><section className="container mx-auto grid gap-4 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">{pricingHighlights.map((item) => <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-xl font-bold text-sky-300">{item.price}</p><p className="mt-2 text-sm text-slate-300">{item.note}</p></div>)}<p className="md:col-span-2 lg:col-span-4 text-sm text-slate-300">Final price depends on work type, location, material, timing, and additional issues found during inspection.</p></section></LandingShell>;
}
