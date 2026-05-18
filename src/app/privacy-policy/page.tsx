import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "Privacy policy for Jambh Electrics." };

export default function PrivacyPolicyPage() {
  const items = [
    "We collect contact and service details such as name, phone, location, and requirement.",
    "We use contact information only for service communication, account support, billing, and records.",
    "Service records may be stored to improve support continuity and issue tracking.",
    "Payment and communication logs are retained for support, dispute handling, and compliance.",
    "We do not misuse personal data and do not sell customer information.",
    "For deletion/correction requests, contact us through phone, WhatsApp, or email."
  ];
  return <LandingShell title="Privacy Policy" copy="How we collect, use, and protect your information."><section className="container mx-auto px-4 py-12"><div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><ul className="space-y-3 text-sm text-slate-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div></section></LandingShell>;
}
