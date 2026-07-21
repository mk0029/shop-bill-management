import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Help & Payment Policy - Jambh Electricals Electrical Services Lilas, Haryana",
  description: "Help and payment policy for Jambh Electricals. Learn about payment methods, billing process, service charges, and how we handle payments for electrical services in Lilas, Sainiwas, Siwani, Hisar & nearby areas, Haryana.",
  keywords: [
    "Jambh Electricals payment",
    "electrical service payment methods",
    "billing process",
    "service charges Lilas",
  ],
  openGraph: {
    title: "Help & Payment Policy | Jambh Electricals",
    description: "Payment policy, billing process, service charges, and payment methods for Jambh Electricals electrical services.",
  },
  twitter: {
    title: "Help & Payment Policy | Jambh Electricals",
    description: "Payment policy, billing process, service charges, and payment methods for Jambh Electricals electrical services.",
  },
  alternates: {
    canonical: `${SITE_URL}/help-payment-policy`,
  },
};

export default function HelpPaymentPolicyPage() {
  return (
    <LandingShell
      titleKey="pages.helpPayment.title"
      copyKey="pages.helpPayment.copy"
    >
      <SimplePolicyContent page="helpPayment" />
    </LandingShell>
  );
}
