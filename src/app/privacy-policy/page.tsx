import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Jambh Electrics. Learn how we collect, use, store, and protect your personal data when using our electrical services and website.",
  openGraph: {
    title: "Privacy Policy | Jambh Electrics",
    description: "Privacy policy for Jambh Electrics. Learn how we collect, use, store, and protect your personal data.",
  },
  twitter: {
    title: "Privacy Policy | Jambh Electrics",
    description: "Privacy policy for Jambh Electrics. Learn how we collect, use, store, and protect your personal data.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LandingShell titleKey="pages.privacy.title" copyKey="pages.privacy.copy">
      <SimplePolicyContent page="privacy" />
    </LandingShell>
  );
}
