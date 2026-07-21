import { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ServiceDetailContent } from "@landing/components/layout/public-page-content";
import { services } from "@landing/lib/site-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

const serviceKeywords: Record<string, string[]> = {
  "electrical-product-sales": [
    "electrical products Lilas", "electrical products Siwani", "electrical shop", "electrical store", "electrical items",
    "wires", "switches", "MCB", "RCCB", "LED bulb", "fan", "electrical accessories",
    "electrical material", "electrical hardware", "Jambh Electricals",
  ],
  "home-electrical-services": [
    "home electrical services", "electrician near me", "home electrician", "residential electrician",
    "electrical repair home", "home wiring", "house wiring", "electrical maintenance",
    "electrician Lilas", "electrician Sainiwas", "electrician Siwani", "bijli wala", "ghar ki wiring",
  ],
  "new-wiring-fitting": [
    "house wiring", "home wiring", "electrical wiring", "new wiring", "rewiring",
    "concealed wiring", "surface wiring", "wire installation", "wire repair",
    "complete house wiring", "villa wiring", "flat wiring", "office wiring",
    "electrical installation Lilas", "electrical installation Siwani", "ghar wiring",
  ],
  "appliance-repair": [
    "appliance repair", "electrical repair", "electric repair", "appliance electrical repair",
    "fan repair", "light repair", "switch repair", "socket repair",
    "electrical fault repair Lilas", "electrical fault repair Siwani", "bijli repair",
  ],
  "fault-detection": [
    "fault repair", "electrical fault", "fault finding", "short circuit repair",
    "power trip repair", "MCB tripping", "RCCB tripping", "electrical breakdown",
    "current leakage", "earth leakage", "phase problem", "electrical diagnostics",
    "electrical emergency", "trip problem", "current problem",
  ],
  "tool-rental": [
    "tool rental", "electrical tools rent", "rent drill", "rent tester",
    "electrical tool hire", "tool rental Lilas", "tool rental Siwani",
  ],
  "maintenance-support": [
    "electrical maintenance", "electrical inspection", "electrical safety inspection",
    "preventive maintenance", "electrical upgrade", "electrical renovation",
    "load extension", "meter installation", "electrical maintenance Lilas", "electrical maintenance Siwani",
  ],
  "emergency-support": [
    "emergency electrician", "24 hour electrician", "electrical emergency",
    "power failure repair", "electrical breakdown", "emergency electrician Lilas", "emergency electrician Siwani",
    "electric emergency", "bijli fault",
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) return { title: "Service Not Found" };

  const keywords = serviceKeywords[p.slug] || [];
  const title = `${service.title} | Jambh Electricals - Electrician Lilas, Sainiwas, Siwani, Hisar`;
  const description = `${service.title} by Jambh Electricals in Lilas, Haryana. ${service.shortDescription} Professional electrician services serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. Call +918607871431.`;

  return {
    title: service.title,
    description,
    keywords: [
      service.title,
      "Jambh Electricals",
      "Jambh Electricals Lilas",
      "electrician Lilas",
      "electrician Siwani",
      "electrical services Lilas",
      ...keywords,
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/services/${p.slug}`,
      images: [{ url: "/je-p-512.png", width: 512, height: 512, alt: `${service.title} - Jambh Electricals, Lilas` }],
    },
    twitter: {
      title,
      description,
      images: ["/je-p-512.png"],
    },
    alternates: {
      canonical: `${SITE_URL}/services/${p.slug}`,
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) notFound();

  return (
    <LandingShell
      titleKey={`services.items.${service.slug}.title`}
      copyKey={`services.items.${service.slug}.shortDescription`}
    >
      <ServiceDetailContent
        serviceSlug={service.slug}
        includesCount={service.includes.length}
      />
      <Script
        id={`ld-json-service-${service.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            description: `${service.title} by Jambh Electricals in Lilas, Haryana. ${service.shortDescription} Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas.`,
            url: `${SITE_URL}/services/${service.slug}`,
            provider: {
              "@type": "ElectricalContractor",
              name: "Jambh Electricals",
              url: SITE_URL,
              telephone: "+918607871431",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Lilas",
                addressLocality: "Lilas",
                addressRegion: "Haryana",
                addressCountry: "IN",
              },
            },
            areaServed: [
              { "@type": "City", name: "Lilas" },
              { "@type": "City", name: "Sainiwas" },
              { "@type": "City", name: "Siwani" },
              { "@type": "City", name: "Hisar" },
              { "@type": "State", name: "Haryana" },
            ],
            serviceType: service.title,
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />
      <Script
        id={`ld-json-service-${service.slug}-breadcrumb`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
              { "@type": "ListItem", position: 3, name: service.title, item: `${SITE_URL}/services/${service.slug}` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
