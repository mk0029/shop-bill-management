"use client";

import { useEffect, useMemo } from "react";
import { getSupportContact } from "@/lib/auth-service";
import Header from "./Header";
import HeroSection from "./sections/HeroSection";
import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import RequestAccountSection from "./sections/RequestAccountSection";
import ContactSection from "./sections/ContactSection";
import FooterSection from "./sections/FooterSection";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { isAuthenticated, role, hydrated } = useAuthStore();

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
    [],
  );

  // Verify auth first, then render or redirect
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/customer/bills");
    }
  }, [hydrated, isAuthenticated, role, router]);

  // While verifying, show a lightweight loader to avoid flashing the landing UI
  if (!hydrated) {
    return (
      <main className="h-[var(--app-vh,100dvh)] bg-background text-foreground grid place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Verifying...
        </div>
      </main>
    );
  }

  // If authenticated, redirect effect will run; render nothing
  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="h-[var(--app-vh,100dvh)] bg-background text-foreground">
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
