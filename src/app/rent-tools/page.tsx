import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { RentToolsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Tool Rental",
  description: "Rent electrical tools from Jambh Electrics in Siwani, Haryana. Hourly and daily rental for drills, testers, and more at transparent rates.",
  openGraph: {
    title: "Electrical Tool Rental | Jambh Electrics",
    description: "Rent electrical tools at affordable hourly and daily rates from Jambh Electrics in Siwani, Haryana.",
  },
  twitter: {
    title: "Electrical Tool Rental | Jambh Electrics",
    description: "Rent electrical tools at affordable hourly and daily rates from Jambh Electrics in Siwani, Haryana.",
  },
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
