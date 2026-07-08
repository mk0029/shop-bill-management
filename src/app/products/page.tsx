import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ProductsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Electrical Products",
  description: "Browse electrical product categories from Jambh Electrics — switches, sockets, wires, lights, MCBs, boards, and accessories. Quality brands at fair prices in Siwani, Haryana.",
  openGraph: {
    title: "Electrical Products | Jambh Electrics",
    description: "Shop electrical products — switches, sockets, wires, lights, MCBs, boards, and accessories from Jambh Electrics in Siwani, Haryana.",
  },
  twitter: {
    title: "Electrical Products | Jambh Electrics",
    description: "Shop electrical products — switches, sockets, wires, lights, MCBs, boards, and accessories from Jambh Electrics in Siwani, Haryana.",
  },
};

export default function ProductsPage() {
  return (
    <LandingShell titleKey="pages.products.title" copyKey="pages.products.copy">
      <ProductsContent />
    </LandingShell>
  );
}
