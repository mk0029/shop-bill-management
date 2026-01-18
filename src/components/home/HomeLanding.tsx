"use client";

import { useMemo } from "react";
import { getSupportContact } from "@/lib/auth-service";
import Header from "./Header";
import HeroSection from "./sections/HeroSection";
import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import RequestAccountSection from "./sections/RequestAccountSection";
import ContactSection from "./sections/ContactSection";
import FooterSection from "./sections/FooterSection";
import ClientRedirect from "./client-redirect";
import {
  PlugZap,
  Wrench,
  Bolt,
  Cable,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

export default function HomeLanding() {
  const support = getSupportContact();

  const services = useMemo(
    () => [
      {
        icon: PlugZap,
        title: "Electrical Products",
        desc: "Switches, sockets, wires, lights, MCBs and accessories.",
      },
      {
        icon: Wrench,
        title: "Home Electrical Services",
        desc: "Installations, repairs and maintenance by skilled technicians.",
      },
      {
        icon: Bolt,
        title: "Appliance Repair",
        desc: "Washing machine, refrigerator, fans, motors and more.",
      },
      {
        icon: ShieldCheck,
        title: "Fault Detection & Fixing",
        desc: "Quick diagnosis and safe, reliable fixes.",
      },
      {
        icon: Cable,
        title: "Complete New Wiring",
        desc: "House and commercial wiring with safety-first approach.",
      },
      {
        icon: BadgeCheck,
        title: "Genuine Pricing",
        desc: "Transparent, fair estimates with no hidden costs.",
      },
    ],
    []
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground">
        {/* If already authenticated in this browser, redirect to dashboard/customer portal. */}
        <ClientRedirect redirectUnauthenticated={false} />
        <HeroSection
          support={{ phone: support.phone, whatsapp: support.whatsapp }}
        />
        <AboutSection />
        <ServicesSection services={services} />
        <RequestAccountSection
          support={{ email: support.email, whatsapp: support.whatsapp }}
        />
        <ContactSection support={support} />
        <FooterSection support={support} />
      </main>
    </>
  );
}
