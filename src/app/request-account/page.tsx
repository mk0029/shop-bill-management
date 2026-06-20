import { Metadata } from "next";
import {
  LandingShell,
  RequestAccountBlock,
} from "@landing/components/layout/landing-shell";

export const metadata: Metadata = {
  title: "Request Account",
  description: "Request a customer account with Jambh Electrics.",
};

export default function RequestAccountPage() {
  return (
    <LandingShell
      titleKey="pages.requestAccount.title"
      copyKey="pages.requestAccount.copy"
    >
      <section className="container mx-auto px-4 py-12">
        <RequestAccountBlock />
      </section>
    </LandingShell>
  );
}
