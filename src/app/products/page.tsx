import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ProductsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Products",
  description: "Electrical product categories from Jambh Electrics.",
};

export default function ProductsPage() {
  return (
    <LandingShell titleKey="pages.products.title" copyKey="pages.products.copy">
      <ProductsContent />
    </LandingShell>
  );
}
