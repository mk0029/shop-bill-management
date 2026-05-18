import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";

export const metadata: Metadata = { title: "About", description: "About Jambh Electrics: mission, trust, and local service approach." };

export default function AboutPage() {
  const bullets = ["Our mission is to provide safe, reliable, and fairly priced electrical products and services.", "Customers trust us for clear communication, practical solutions, and dependable local support.", "We follow safety-first work methods and use quality materials whenever possible.", "Our local service model focuses on fast response, honest estimates, and long-term relationships."];
  return (
    <LandingShell title="About Jambh Electrics" copy="Serving homes and local businesses with trusted electrical support.">
      <section className="container mx-auto px-4 py-12"><div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold">Who We Are</h2><ul className="mt-4 space-y-3 text-sm text-slate-300">{bullets.map((b) => <li key={b}>• {b}</li>)}</ul></div></section>
    </LandingShell>
  );
}
