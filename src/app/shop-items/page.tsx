import { Metadata } from "next";
import Script from "next/script";
import ShopItemsClient from "./shop-items-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Electrical Items Shop - Browse Wires, Switches, MCB, LED, Fan Products Hisar",
  description: "Browse all electrical items at Jambh Electricals shop in Hisar, Haryana. Wires, cables, modular switches, sockets, MCB RCCB, distribution board, LED lights, fans, inverters, capacitors, electrical tape, conduit, junction boxes, extension boards, and all electrical products and accessories.",
  keywords: [
    "electrical shop",
    "electrical shop near me",
    "electrical store",
    "electric store",
    "electrical items Hisar",
    "electrical products",
    "electrical material",
    "electrical accessories",
    "wire shop",
    "cable shop",
    "switch shop",
    "MCB shop",
    "LED shop",
    "Jambh Electricals",
    "Jambh Electricals Hisar",
    "electric shop",
    "electrical wholesaler",
    "electrical dealer",
    "electrical supplier",
    "electrical equipment",
    "electrical hardware",
    "electrical items",
    "electric shop Hisar",
    "electrical fitting",
    "bijli ki dukaan",
    "बिजली सामान",
    "इलेक्ट्रिकल दुकान",
  ],
  openGraph: {
    title: "Electrical Items Shop | Jambh Electricals - Electrical Store Hisar",
    description: "Browse all electrical items at Jambh Electricals in Hisar — wires, switches, MCB RCCB, LED lights, fans, inverters, and all electrical accessories.",
    images: [{ url: "/je-p-512.png", width: 512, height: 512, alt: "Electrical Items Shop at Jambh Electricals Hisar" }],
  },
  twitter: {
    title: "Electrical Items Shop | Jambh Electricals Hisar",
    description: "Browse all electrical items at Jambh Electricals in Hisar — wires, switches, MCB RCCB, LED lights, fans, inverters.",
    images: ["/je-p-512.png"],
  },
  alternates: {
    canonical: `${SITE_URL}/shop-items`,
  },
};

export default function ShopItemsPage() {
  return (
    <>
      <ShopItemsClient />
      <Script
        id="ld-json-shop-items-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Shop Items", item: `${SITE_URL}/shop-items` },
            ],
          }),
        }}
      />
      <Script
        id="ld-json-shop-items-catalog"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Electrical Products Shop | Jambh Electricals Hisar",
            description: "Browse electrical items at Jambh Electricals shop in Hisar — wires, switches, MCB RCCB, LED lights, fans, inverters, and all electrical products.",
            url: `${SITE_URL}/shop-items`,
            provider: {
              "@type": "ElectricalContractor",
              name: "Jambh Electricals",
              url: SITE_URL,
            },
          }),
        }}
      />
    </>
  );
}
