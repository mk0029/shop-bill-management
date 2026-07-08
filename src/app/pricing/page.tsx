import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { PricingContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Pricing & Rates",
  description: "Transparent pricing for electrical services from Jambh Electrics — inspection, home service, wiring, emergency support, product sale and installation prices in Siwani, Haryana.",
  openGraph: {
    title: "Pricing & Rates | Jambh Electrics",
    description: "Transparent pricing for electrical services — inspection, home service, wiring, emergency, product sale and installation in Siwani, Haryana.",
  },
  twitter: {
    title: "Pricing & Rates | Jambh Electrics",
    description: "Transparent pricing for electrical services — inspection, home service, wiring, emergency, product sale and installation in Siwani, Haryana.",
  },
};

export default function PricingPage() {
  return (
    <LandingShell titleKey="pages.pricing.title" copyKey="pages.pricing.copy">
      <PricingContent />
    </LandingShell>
  );
}
