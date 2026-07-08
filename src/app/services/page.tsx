import { Metadata } from "next";
import {
  LandingShell,
  ServicesGrid,
} from "@landing/components/layout/landing-shell";

export const metadata: Metadata = {
  title: "Electrical Services",
  description: "Professional electrical services by Jambh Electrics — product sales, home wiring, appliance repair, fault detection, tool rental, and emergency support in Siwani, Haryana.",
  openGraph: {
    title: "Electrical Services | Jambh Electrics",
    description: "Professional electrical services — product sales, home wiring, appliance repair, fault detection, tool rental, and emergency support in Siwani, Haryana.",
  },
  twitter: {
    title: "Electrical Services | Jambh Electrics",
    description: "Professional electrical services — product sales, home wiring, appliance repair, fault detection, tool rental, and emergency support in Siwani, Haryana.",
  },
};

export default function ServicesPage() {
  return (
    <LandingShell titleKey="pages.services.title" copyKey="pages.services.copy">
      <section className="container mx-auto px-4 py-12">
        <ServicesGrid />
      </section>
    </LandingShell>
  );
}
