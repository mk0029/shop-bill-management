import { Metadata } from "next";
import Script from "next/script";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ProductsContent } from "@landing/components/layout/public-page-content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jambh-ell.vercel.app";

export const metadata: Metadata = {
  title: "Electrical Products - Wires, Switches, MCB RCCB, LED, Fan, Accessories - Lilas, Sainiwas, Siwani, Hisar",
  description: "Browse electrical products at Jambh Electricals based in Lilas, Haryana. We serve Lilas, Sainiwas, Siwani, Hisar & nearby areas. Wires and cables, FR wire, FRLS wire, modular switches, sockets, MCB RCCB, distribution board, LED bulbs, tube lights, ceiling fans, exhaust fans, inverters, batteries, electrical tape, conduit, junction boxes, extension boards, and all electrical accessories.",
  keywords: [
    "electrical products",
    "electrical items Lilas",
    "electrical items Siwani",
    "electrical shop Lilas",
    "electrical shop Siwani",
    "electrical shop Hisar",
    "wires",
    "electrical wire",
    "FR wire",
    "FRLS wire",
    "modular switches",
    "sockets",
    "MCB",
    "RCCB",
    "DB Box",
    "distribution board",
    "LED bulb",
    "tube light",
    "ceiling fan",
    "exhaust fan",
    "inverter",
    "battery",
    "electrical tape",
    "conduit",
    "junction box",
    "extension board",
    "electrical accessories",
    "electrical material",
    "electrical hardware",
    "electrical equipment",
    "Jambh Electricals",
    "wire shop",
    "switch shop",
    "MCB shop",
    "LED shop",
  ],
  openGraph: {
    title: "Electrical Products | Jambh Electricals - Electrical Shop Hisar",
    description: "Shop electrical products — wires, switches, MCB RCCB, LED lights, fans, inverters, accessories from Jambh Electricals in Hisar, Haryana.",
    images: [{ url: "/je-p-512.png", width: 512, height: 512, alt: "Electrical Products at Jambh Electricals Hisar" }],
  },
  twitter: {
    title: "Electrical Products | Jambh Electricals Hisar",
    description: "Shop electrical products — wires, switches, MCB RCCB, LED lights, fans, inverters, accessories from Jambh Electricals in Hisar.",
    images: ["/je-p-512.png"],
  },
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

export default function ProductsPage() {
  return (
    <LandingShell titleKey="pages.products.title" copyKey="pages.products.copy">
      <ProductsContent />
      <Script
        id="ld-json-products-list"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Electrical Products at Jambh Electricals",
            description: "Complete range of electrical products — wires, switches, MCB RCCB, LED lights, fans, inverters, and accessories available at Jambh Electricals, Lilas, Haryana. Serving Lilas, Sainiwas, Siwani, Hisar & nearby areas.",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Wires and Cables", description: "Electrical wires including FR wire, FRLS wire, house wire, cable installation" },
              { "@type": "ListItem", position: 2, name: "Modular Switches and Sockets", description: "Modular switches, sockets, plug points, fan regulators, bell switches" },
              { "@type": "ListItem", position: 3, name: "MCB and RCCB", description: "MCB, RCCB, ELCB, isolator, changeover, circuit breakers" },
              { "@type": "ListItem", position: 4, name: "Distribution Board and DB Box", description: "Electrical panel, main panel, consumer unit, DB box" },
              { "@type": "ListItem", position: 5, name: "LED Lights", description: "LED bulb, tube light, panel light, ceiling light, wall light, decorative lighting" },
              { "@type": "ListItem", position: 6, name: "Fans", description: "Ceiling fan, exhaust fan, wall fan, fan capacitor, fan regulator" },
              { "@type": "ListItem", position: 7, name: "Inverters and Batteries", description: "Home inverter, UPS, battery replacement, power backup" },
              { "@type": "ListItem", position: 8, name: "Electrical Accessories", description: "Electrical tape, PVC tape, conduit, PVC pipe, junction box, extension board, power strip" },
            ],
          }),
        }}
      />
      <Script
        id="ld-json-products-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_URL}/products` },
            ],
          }),
        }}
      />
    </LandingShell>
  );
}
