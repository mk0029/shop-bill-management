import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { PricingContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent service pricing highlights for Jambh Electrics.",
};

export default function PricingPage() {
  return (
    <LandingShell titleKey="pages.pricing.title" copyKey="pages.pricing.copy">
      <PricingContent />
    </LandingShell>
  );
}
