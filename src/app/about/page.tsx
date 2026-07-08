import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { AboutContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Jambh Electrics — our mission, values, skilled electricians, and commitment to quality electrical services in Siwani, Haryana.",
  openGraph: {
    title: "About Jambh Electrics | Trusted Electrical Services",
    description:
      "Learn about Jambh Electrics — our mission, values, skilled electricians, and commitment to quality electrical services in Siwani, Haryana.",
  },
  twitter: {
    title: "About Jambh Electrics | Trusted Electrical Services",
    description:
      "Learn about Jambh Electrics — our mission, values, skilled electricians, and commitment to quality electrical services in Siwani, Haryana.",
  },
};

export default function AboutPage() {
  return (
    <LandingShell titleKey="pages.about.title" copyKey="pages.about.copy">
      <AboutContent />
    </LandingShell>
  );
}
