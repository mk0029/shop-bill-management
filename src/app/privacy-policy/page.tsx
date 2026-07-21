import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Privacy Policy - Jambh Electricals Electrical Services Lilas, Haryana",
  description: "Privacy policy for Jambh Electricals. Learn how we collect, use, store, and protect your personal data when using our electrical services, house wiring, repair services, and website in Lilas, Sainiwas, Siwani, Hisar & nearby areas, Haryana.",
  keywords: [
    "Jambh Electricals privacy",
    "electrical service privacy policy",
    "data protection",
    "privacy Lilas",
  ],
  openGraph: {
    title: "Privacy Policy | Jambh Electricals",
    description: "Privacy policy for Jambh Electricals. Learn how we collect, use, store, and protect your personal data.",
  },
  twitter: {
    title: "Privacy Policy | Jambh Electricals",
    description: "Privacy policy for Jambh Electricals. Learn how we collect, use, store, and protect your personal data.",
  },
  alternates: {
    canonical: `${SITE_URL}/privacy-policy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LandingShell titleKey="pages.privacy.title" copyKey="pages.privacy.copy">
      <SimplePolicyContent page="privacy" />
    </LandingShell>
  );
}
