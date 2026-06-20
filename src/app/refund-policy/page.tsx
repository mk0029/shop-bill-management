import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund policy for Jambh Electrics services and products.",
};

export default function RefundPolicyPage() {
  return (
    <LandingShell titleKey="pages.refund.title" copyKey="pages.refund.copy">
      <SimplePolicyContent page="refund" />
    </LandingShell>
  );
}
