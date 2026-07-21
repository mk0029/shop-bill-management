import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy - Jambh Electricals Lilas, Haryana",
  description: "Refund and cancellation policy for Jambh Electricals electrical services and products. Understand our terms for service refunds, product returns, and cancellations in Lilas, Sainiwas, Siwani, Hisar & nearby areas, Haryana.",
  keywords: [
    "Jambh Electricals refund",
    "electrical service refund policy",
    "cancellation policy",
    "refund Lilas",
  ],
  openGraph: {
    title: "Refund & Cancellation Policy | Jambh Electricals",
    description: "Refund and cancellation policy for Jambh Electricals electrical services and products.",
  },
  twitter: {
    title: "Refund & Cancellation Policy | Jambh Electricals",
    description: "Refund and cancellation policy for Jambh Electricals electrical services and products.",
  },
  alternates: {
    canonical: `${SITE_URL}/refund-policy`,
  },
};

export default function RefundPolicyPage() {
  return (
    <LandingShell titleKey="pages.refund.title" copyKey="pages.refund.copy">
      <SimplePolicyContent page="refund" />
    </LandingShell>
  );
}
