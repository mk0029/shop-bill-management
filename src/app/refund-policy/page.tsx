import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Refund and cancellation policy for Jambh Electrics services and products. Understand our terms for service refunds, product returns, and cancellations.",
  openGraph: {
    title: "Refund & Cancellation Policy | Jambh Electrics",
    description: "Refund and cancellation policy for Jambh Electrics services and products.",
  },
  twitter: {
    title: "Refund & Cancellation Policy | Jambh Electrics",
    description: "Refund and cancellation policy for Jambh Electrics services and products.",
  },
};

export default function RefundPolicyPage() {
  return (
    <LandingShell titleKey="pages.refund.title" copyKey="pages.refund.copy">
      <SimplePolicyContent page="refund" />
    </LandingShell>
  );
}
