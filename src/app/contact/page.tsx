import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ContactContent } from "@landing/components/layout/public-page-content";
import { getSupportContact } from "@/lib/auth-service";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Jambh Electrics by phone, WhatsApp, email, or form.",
};

export default function ContactPage() {
  const support = getSupportContact();

  return (
    <LandingShell titleKey="pages.contact.title" copyKey="pages.contact.copy">
      <ContactContent support={support} />
    </LandingShell>
  );
}
