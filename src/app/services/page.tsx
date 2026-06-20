import { Metadata } from "next";
import {
  LandingShell,
  ServicesGrid,
} from "@landing/components/layout/landing-shell";

export const metadata: Metadata = {
  title: "Services",
  description: "Detailed electrical services by Jambh Electrics.",
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
