import { Metadata } from "next";
import Script from "next/script";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ContactContent } from "@landing/components/layout/public-page-content";
import { getSupportContact } from "@/lib/auth-service";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";
const PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+918607871431";

export const metadata: Metadata = {
  title: "Contact Jambh Electricals - Electrician & Electrical Shop Lilas, Haryana",
  description: "Contact Jambh Electricals by phone, WhatsApp, or email. Get electrical service quotes for house wiring, MCB RCCB repair, LED installation, fan repair, fault finding, and all electrical services in Lilas, Sainiwas, Siwani, Hisar & nearby areas. Call " + PHONE + ".",
  keywords: [
    "Jambh Electricals contact",
    "electrician Lilas phone number",
    "electrical shop Lilas contact",
    "electrician near me contact",
    "electrical service Lilas",
    "emergency electrician Lilas",
    "electrical repair Lilas contact",
    "bijli wala Lilas",
    "electrician Sainiwas",
    "electrician Siwani",
    "electrician Hisar",
  ],
  openGraph: {
    title: "Contact Jambh Electricals | Electrician & Electrical Shop Hisar",
    description: "Reach Jambh Electricals by phone, WhatsApp, email, or contact form. Quick response for electrical services in Hisar, Haryana.",
  },
  twitter: {
    title: "Contact Jambh Electricals | Electrician Hisar",
    description: "Reach Jambh Electricals by phone, WhatsApp, email, or contact form. Quick response for electrical services in Hisar, Haryana.",
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  const support = getSupportContact();

  return (
    <LandingShell titleKey="pages.contact.title" copyKey="pages.contact.copy">
      <ContactContent support={support} />
      <Script
        id="ld-json-contact-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Contact", item: `${SITE_URL}/contact` },
            ],
          }),
        }}
      />
      <Script
        id="ld-json-contact-page"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact Jambh Electricals",
            description: "Contact Jambh Electricals for electrician services, electrical repair, house wiring, MCB RCCB, LED lights, fan repair, inverter, motor repair in Lilas, Sainiwas, Siwani, Hisar & nearby areas.",
            url: `${SITE_URL}/contact`,
            mainEntity: {
              "@type": "ElectricalContractor",
              name: "Jambh Electricals",
              telephone: PHONE,
              email: "jambhelectric@gmail.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Lilas",
                addressLocality: "Lilas",
                addressRegion: "Haryana",
                addressCountry: "IN",
              },
            },
          }),
        }}
      />
    </LandingShell>
  );
}
