import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { SimplePolicyContent } from "@landing/components/layout/public-page-content";

export const metadata: Metadata = {
  title: "Help & Payment Policy",
  description: "Help and payment policy for Jambh Electrics. Learn about payment methods, billing process, service charges, and how we handle payments for electrical services.",
  openGraph: {
    title: "Help & Payment Policy | Jambh Electrics",
    description: "Payment policy, billing process, service charges, and payment methods for Jambh Electrics electrical services.",
  },
  twitter: {
    title: "Help & Payment Policy | Jambh Electrics",
    description: "Payment policy, billing process, service charges, and payment methods for Jambh Electrics electrical services.",
  },
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
