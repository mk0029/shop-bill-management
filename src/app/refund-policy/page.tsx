import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";

export const metadata: Metadata = { title: "Refund Policy", description: "Refund policy for Jambh Electrics services and products." };

export default function RefundPolicyPage() {
  const points = [
    "Inspection, service visit, and completed work payments are non-refundable.",
    "Advance-paid but not-started service may be reviewed for refund eligibility.",
    "No refund after work starts or material has been used.",
    "Product refunds depend on manufacturer/supplier policy.",
    "Approved refunds are processed through original payment method where possible.",
    "Support-first resolution is attempted before refund decisions."
  ];
  return <LandingShell title="Refund Policy" copy="Please review refund applicability before confirming payment."><section className="container mx-auto px-4 py-12"><div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><ul className="space-y-3 text-sm text-slate-300">{points.map((p) => <li key={p}>• {p}</li>)}</ul></div></section></LandingShell>;
}
