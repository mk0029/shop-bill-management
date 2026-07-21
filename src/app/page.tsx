import type { Metadata } from "next";
import Script from "next/script";
import HomeLanding from "@landing/components/home/HomeLanding";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Jambh Electricals - Professional Electrical Services in Lilas, Sainiwas, Siwani, Hisar & Nearby Areas",
  description: "Jambh Electricals is a trusted electrical shop and electrician based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar, Tosham, Bhiwani, Hansi, Barwala, Agroha, Adampur & nearby villages. Professional electrician services — house wiring, MCB RCCB repair, LED light installation, fan repair, inverter repair, motor repair, electrical fault finding, and all electrical products. Emergency electrician available. Call +918607871431.",
  keywords: [
    "Jambh Electricals",
    "Jambh Electricals Lilas",
    "Jambh Electricals Sainiwas",
    "Jambh Electricals Siwani",
    "Jambh Electricals Hisar",
    "electrician Lilas",
    "electrician Sainiwas",
    "electrician Siwani",
    "electrician Hisar",
    "electrician near me",
    "best electrician Lilas",
    "electrical shop Lilas",
    "electrical shop Siwani",
    "electrical shop Hisar",
    "house wiring",
    "home wiring",
    "MCB repair",
    "RCCB repair",
    "fault repair",
    "LED light installation",
    "fan repair",
    "inverter repair",
    "motor repair",
    "switch repair",
    "electrical services",
    "bijli wala",
    "bijli mistri",
    "ghar wiring",
    "emergency electrician",
    "electrical items",
    "electrical products",
  ],
  openGraph: {
    title: "Jambh Electricals - Professional Electrical Services in Lilas, Sainiwas, Siwani, Hisar",
    description: "Trusted electrical shop and electrician based in Lilas, Haryana. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. House wiring, MCB RCCB, LED lights, fan repair, inverter, motor repair.",
    url: SITE_URL,
    images: [
      { url: "/je-p-512.png", width: 512, height: 512, alt: "Jambh Electricals - Electrical Shop and Electrician in Lilas Sainiwas Siwani Hisar Haryana" },
    ],
  },
  twitter: {
    title: "Jambh Electricals - Electrical Shop & Electrician Lilas, Sainiwas, Siwani, Hisar",
    description: "Trusted electrical shop in Lilas, Haryana. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas. Electrician services, house wiring, MCB RCCB, LED, fan, inverter, motor repair. Call +918607871431.",
    images: ["/je-p-512.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  await getServerAuth();

  return (
    <>
      <HomeLanding />
      <Script
        id="ld-json-home-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
              },
            ],
          }),
        }}
      />
    </>
  );
}
