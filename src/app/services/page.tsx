import { Metadata } from "next";
import Script from "next/script";
import {
  LandingShell,
  ServicesGrid,
} from "@landing/components/layout/landing-shell";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Electrical Services - House Wiring, Fault Repair, MCB RCCB, LED, Fan, Motor Repair - Lilas, Sainiwas, Siwani, Hisar",
  description: "Jambh Electricals offers professional electrical services based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar & nearby areas — house wiring, rewiring, electrical fault repair, MCB RCCB installation, LED light fitting, ceiling fan repair, inverter service, motor rewinding, emergency electrician, and electrical maintenance.",
  keywords: [
    "electrical services Lilas",
    "electrical services Sainiwas",
    "electrical services Siwani",
    "electrical services Hisar",
    "electrician services",
    "house wiring",
    "home wiring",
    "electrical wiring",
    "fault repair",
    "MCB repair",
    "RCCB repair",
    "LED light installation",
    "fan repair",
    "inverter repair",
    "motor repair",
    "electrical maintenance",
    "emergency electrician",
    "electrical contractor Hisar",
    "electrical installation",
    "electrical troubleshooting",
    "electrical inspection",
    "bijli ka kaam",
    "ghar wiring",
  ],
  openGraph: {
    title: "Electrical Services | Jambh Electricals - Electrician Hisar",
    description: "Professional electrical services — house wiring, fault repair, MCB RCCB, LED lights, fan repair, inverter service, motor repair, emergency electrician in Hisar, Haryana.",
  },
  twitter: {
    title: "Electrical Services | Jambh Electricals Hisar",
    description: "Professional electrical services — house wiring, fault repair, MCB RCCB, LED lights, fan repair, inverter, motor repair in Hisar, Haryana.",
  },
  alternates: {
    canonical: `${SITE_URL}/services`,
  },
};

export default function ServicesPage() {
  return (
    <LandingShell titleKey="pages.services.title" copyKey="pages.services.copy">
      <section className="container mx-auto px-4 py-12" aria-label="Electrical services offered by Jambh Electricals">
        <ServicesGrid />
      </section>
      <Script
        id="ld-json-services-list"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Electrical Services by Jambh Electricals",
            description: "Complete electrical services based in Lilas, Haryana — house wiring, fault repair, MCB RCCB, LED lighting, fan repair, inverter, motor repair, and emergency electrician. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas.",
            numberOfItems: 8,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Electrical Product Sales", url: `${SITE_URL}/services/electrical-product-sales` },
              { "@type": "ListItem", position: 2, name: "Home Electrical Services", url: `${SITE_URL}/services/home-electrical-services` },
              { "@type": "ListItem", position: 3, name: "New Wiring and Fitting", url: `${SITE_URL}/services/new-wiring-fitting` },
              { "@type": "ListItem", position: 4, name: "Appliance Repair", url: `${SITE_URL}/services/appliance-repair` },
              { "@type": "ListItem", position: 5, name: "Fault Detection and Repair", url: `${SITE_URL}/services/fault-detection` },
              { "@type": "ListItem", position: 6, name: "Tool Rental", url: `${SITE_URL}/services/tool-rental` },
              { "@type": "ListItem", position: 7, name: "Maintenance Support", url: `${SITE_URL}/services/maintenance-support` },
              { "@type": "ListItem", position: 8, name: "Emergency Electrical Support", url: `${SITE_URL}/services/emergency-support` },
            ],
          }),
        }}
      />
      <Script
        id="ld-json-services-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
