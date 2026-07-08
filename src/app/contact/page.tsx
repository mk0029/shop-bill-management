import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ContactContent } from "@landing/components/layout/public-page-content";
import { getSupportContact } from "@/lib/auth-service";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Jambh Electrics by phone, WhatsApp, email, or our contact form. Get electrical service quotes, repairs, and support in Siwani, Haryana.",
  openGraph: {
    title: "Contact Jambh Electrics | Get Electrical Support",
    description: "Reach Jambh Electrics by phone, WhatsApp, email, or contact form. Quick response for electrical services in Siwani, Haryana.",
  },
  twitter: {
    title: "Contact Jambh Electrics | Get Electrical Support",
    description: "Reach Jambh Electrics by phone, WhatsApp, email, or contact form. Quick response for electrical services in Siwani, Haryana.",
  },
};

export default function ContactPage() {
  const support = getSupportContact();

  return (
    <LandingShell titleKey="pages.contact.title" copyKey="pages.contact.copy">
      <ContactContent support={support} />
    </LandingShell>
  );
}
