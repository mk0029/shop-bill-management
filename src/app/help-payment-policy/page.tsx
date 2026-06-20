import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Help & Payment Policy",
  description: "Help and payment policies for Jambh Electrics.",
};

export default function HelpPaymentPolicyPage() {
  return (
    <LandingShell
      titleKey="pages.helpPayment.title"
      copyKey="pages.helpPayment.copy"
    >
      <SimplePolicyContent page="helpPayment" />
    </LandingShell>
  );
}
