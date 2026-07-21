import { Metadata } from "next";
import Script from "next/script";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { PricingContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Pricing & Rates - Electrical Services Cost Lilas, Sainiwas, Siwani, Hisar",
  description: "Transparent pricing for electrical services at Jambh Electricals, Lilas, Haryana. Affordable rates for house wiring, MCB RCCB repair, LED installation, fan repair, inverter service, motor repair, fault finding, and electrical maintenance. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas.",
  keywords: [
    "electrical service cost",
    "electrician rates Lilas",
    "electrician rates Siwani",
    "electrician rates Hisar",
    "house wiring cost",
    "electrical repair price",
    "MCB repair cost",
    "fan repair cost",
    "LED installation cost",
    "affordable electrician",
    "electrical service price Hisar",
    "Jambh Electricals pricing",
    "electrical work charges",
    "bijli ka kharcha",
  ],
  openGraph: {
    title: "Pricing & Rates | Jambh Electricals - Affordable Electrician Hisar",
    description: "Transparent pricing for electrical services — house wiring, MCB RCCB, LED lights, fan repair, inverter, motor repair in Hisar, Haryana.",
  },
  twitter: {
    title: "Pricing & Rates | Jambh Electricals Hisar",
    description: "Transparent pricing for electrical services in Hisar, Haryana.",
  },
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
};

export default function PricingPage() {
  return (
    <LandingShell titleKey="pages.pricing.title" copyKey="pages.pricing.copy">
      <PricingContent />
      <Script
        id="ld-json-pricing-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Pricing", item: `${SITE_URL}/pricing` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
