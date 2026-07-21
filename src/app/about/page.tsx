import { Metadata } from "next";
import Script from "next/script";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { AboutContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "About Jambh Electricals - Trusted Electrician & Electrical Shop in Lilas, Haryana",
  description: "Learn about Jambh Electricals — the trusted electrical shop and electrician service based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar and nearby areas. Our mission, values, skilled electricians, and commitment to quality electrical services.",
  keywords: [
    "Jambh Electricals",
    "Jambh Electricals Lilas",
    "about Jambh Electricals",
    "electrician Lilas",
    "electrical shop Lilas",
    "trusted electrician Haryana",
    "electrical services Lilas",
    "professional electrician",
    "electrical contractor Lilas",
    "electrician Sainiwas",
    "electrician Siwani",
  ],
  openGraph: {
    title: "About Jambh Electricals | Trusted Electrical Shop & Electrician Lilas, Haryana",
    description: "Learn about Jambh Electricals — mission, values, skilled electricians, and quality electrical services based in Lilas, serving Lilas, Sainiwas, Siwani, Hisar & nearby areas.",
  },
  twitter: {
    title: "About Jambh Electricals | Trusted Electrical Services Lilas, Haryana",
    description: "Learn about Jambh Electricals — mission, values, skilled electricians, and quality electrical services based in Lilas, Haryana.",
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <LandingShell titleKey="pages.about.title" copyKey="pages.about.copy">
      <AboutContent />
      <Script
        id="ld-json-about-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
