import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { TermsContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for Jambh Electrics services and website. Understand your rights, obligations, and service policies before engaging our electrical services.",
  openGraph: {
    title: "Terms & Conditions | Jambh Electrics",
    description: "Terms and conditions for Jambh Electrics services, payments, warranties, and website usage.",
  },
  twitter: {
    title: "Terms & Conditions | Jambh Electrics",
    description: "Terms and conditions for Jambh Electrics services, payments, warranties, and website usage.",
  },
};

export default function TermsPage() {
  return (
    <LandingShell titleKey="pages.terms.title" copyKey="pages.terms.copy">
      <TermsContent />
    </LandingShell>
  );
}
