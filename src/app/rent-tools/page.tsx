import { Metadata } from "next";
import Script from "next/script";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { RentToolsContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Tool Rental - Rent Electrical Tools Lilas, Sainiwas, Siwani, Hisar",
  description: "Rent electrical tools from Jambh Electricals in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar & nearby areas. Affordable hourly and daily rental for drills, testers, wire strippers, and more. Contact +918607871431.",
  keywords: [
    "tool rental",
    "rent electrical tools",
    "electrical tools rent Lilas",
    "electrical tools rent Siwani",
    "rent drill",
    "rent tester",
    "tool hire Hisar",
    "electrical tool rental",
    "Jambh Electricals tool rental",
    "affordable tool rent",
  ],
  openGraph: {
    title: "Tool Rental | Jambh Electricals - Rent Electrical Tools Hisar",
    description: "Rent electrical tools at affordable hourly and daily rates from Jambh Electricals in Hisar, Haryana.",
  },
  twitter: {
    title: "Tool Rental | Jambh Electricals Hisar",
    description: "Rent electrical tools at affordable hourly and daily rates from Jambh Electricals in Hisar.",
  },
  alternates: {
    canonical: `${SITE_URL}/rent-tools`,
  },
};

export default function RentToolsPage() {
  return (
    <LandingShell
      titleKey="pages.rentTools.title"
      copyKey="pages.rentTools.copy"
    >
      <RentToolsContent />
      <Script
        id="ld-json-rent-tools-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Tool Rental", item: `${SITE_URL}/rent-tools` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
