import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { AboutContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Jambh Electrics: mission, trust, and local service approach.",
};

export default function AboutPage() {
  return (
    <LandingShell titleKey="pages.about.title" copyKey="pages.about.copy">
      <AboutContent />
    </LandingShell>
  );
}
