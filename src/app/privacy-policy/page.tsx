import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Jambh Electrics.",
};

export default function PrivacyPolicyPage() {
  return (
    <LandingShell titleKey="pages.privacy.title" copyKey="pages.privacy.copy">
      <SimplePolicyContent page="privacy" />
    </LandingShell>
  );
}
