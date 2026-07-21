import { Metadata } from "next";
import Script from "next/script";
import CategoryDetailClient from "./category-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const heading = p.categorySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${heading} | Jambh Electricals Electrical Shop Hisar`,
    description: `Browse ${heading} at Jambh Electricals electrical shop in Hisar, Haryana. Find the best quality ${heading.toLowerCase()} at affordable prices. Electrician services, house wiring, MCB RCCB, LED lights, fan repair, inverter, motor repair. Call +918607871431.`,
    keywords: [
      heading,
      `${heading} Hisar`,
      "Jambh Electricals",
      "Jambh Electricals Hisar",
      "electrical shop Hisar",
      "electrical store",
      "electrical products",
      "electrical items",
      "electric shop",
      "wire shop",
      "switch shop",
      "MCB shop",
      "LED shop",
      "electrical material",
      "electrical accessories",
      "electrical hardware",
    ],
    openGraph: {
      title: `${heading} | Jambh Electricals Electrical Shop Hisar`,
      description: `Browse ${heading} at Jambh Electricals in Hisar. Best quality electrical products at affordable prices.`,
      url: `${SITE_URL}/shop-items/${p.categorySlug}`,
      images: [{ url: "/je-p-512.png", width: 512, height: 512, alt: `${heading} at Jambh Electricals Hisar` }],
    },
    twitter: {
      title: `${heading} | Jambh Electricals Hisar`,
      description: `Browse ${heading} at Jambh Electricals in Hisar.`,
      images: ["/je-p-512.png"],
    },
    alternates: {
      canonical: `${SITE_URL}/shop-items/${p.categorySlug}`,
    },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const p = await params;
  const heading = p.categorySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <CategoryDetailClient />
      <Script
        id={`ld-json-category-${p.categorySlug}-breadcrumb`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Shop Items", item: `${SITE_URL}/shop-items` },
              { "@type": "ListItem", position: 3, name: heading, item: `${SITE_URL}/shop-items/${p.categorySlug}` },
            ],
          }),
        }}
      />
      <Script
        id={`ld-json-category-${p.categorySlug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${heading} | Jambh Electricals Hisar`,
            description: `Browse ${heading} at Jambh Electricals electrical shop in Hisar, Haryana. Best quality electrical products at affordable prices.`,
            url: `${SITE_URL}/shop-items/${p.categorySlug}`,
            isPartOf: {
              "@type": "WebSite",
              name: "Jambh Electricals",
              url: SITE_URL,
            },
            provider: {
              "@type": "ElectricalContractor",
              name: "Jambh Electricals",
              url: SITE_URL,
              telephone: "+918607871431",
            },
          }),
        }}
      />
    </>
  );
}
