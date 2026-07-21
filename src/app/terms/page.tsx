import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { TermsContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Terms & Conditions - Jambh Electricals Electrical Services Lilas, Haryana",
  description: "Terms and conditions for Jambh Electricals electrical services and website. Understand your rights, obligations, payment terms, service warranties, and policies for electrical work in Lilas, Sainiwas, Siwani, Hisar & nearby areas, Haryana.",
  keywords: [
    "Jambh Electricals terms",
    "electrical service terms Lilas",
    "electrician terms and conditions",
    "electrical work policy",
    "service agreement",
  ],
  openGraph: {
    title: "Terms & Conditions | Jambh Electricals",
    description: "Terms and conditions for Jambh Electricals electrical services, payments, warranties, and website usage.",
  },
  twitter: {
    title: "Terms & Conditions | Jambh Electricals",
    description: "Terms and conditions for Jambh Electricals electrical services, payments, warranties, and website usage.",
  },
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <LandingShell titleKey="pages.terms.title" copyKey="pages.terms.copy">
      <TermsContent />
    </LandingShell>
  );
}
