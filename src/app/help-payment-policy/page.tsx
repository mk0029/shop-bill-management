import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";

export const metadata: Metadata = { title: "Help & Payment Policy", description: "Help and payment policies for Jambh Electrics." };

export default function HelpPaymentPolicyPage() {
  const points = [
    "Payment is due after work completion or as pre-agreed.",
    "Advance payment may be required for products, tool rental, inspection, urgent work, or material-heavy tasks.",
    "Charges are discussed before starting work whenever possible.",
    "Pending dues may lead to service hold or future-service restrictions.",
    "For any service, product, payment, or account issue, contact support immediately.",
    "Support is available via phone, WhatsApp, email, or website form."
  ];
  return <LandingShell title="Help & Payment Policy" copy="Clear payment expectations and support commitments."><section className="container mx-auto px-4 py-12"><div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><ul className="space-y-3 text-sm text-slate-300">{points.map((p) => <li key={p}>• {p}</li>)}</ul></div></section></LandingShell>;
}
