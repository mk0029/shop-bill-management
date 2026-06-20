import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { RentToolsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Rent Tools",
  description: "Electrical tool rental from Jambh Electrics.",
};

export default function RentToolsPage() {
  return (
    <LandingShell
      titleKey="pages.rentTools.title"
      copyKey="pages.rentTools.copy"
    >
      <RentToolsContent />
    </LandingShell>
  );
}
