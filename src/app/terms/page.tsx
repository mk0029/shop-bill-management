import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { TermsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for Jambh Electrics services and website.",
};

export default function TermsPage() {
  return (
    <LandingShell titleKey="pages.terms.title" copyKey="pages.terms.copy">
      <TermsContent />
    </LandingShell>
  );
}
