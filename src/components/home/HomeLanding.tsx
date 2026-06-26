"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSupportContact } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth-store";
import { getAuthenticatedHomeRoute } from "@/lib/auth-routes";
import { useRouter } from "next/navigation";
import Header from "./Header";
import HeroSection from "./sections/HeroSection";
import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import RequestAccountSection from "./sections/RequestAccountSection";
import ContactSection from "./sections/ContactSection";
import FooterSection from "./sections/FooterSection";
import {
  PlugZap,
  Wrench,
  Bolt,
  Cable,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

const MANUAL_HOME_KEY = "manual_home";

export default function HomeLanding() {
  const support = getSupportContact();
  const { isAuthenticated, role, hydrated } = useAuthStore();
  const router = useRouter();
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current) return;
    if (!hydrated) return;

    const params = new URLSearchParams(window.location.search);
    const isManual = params.has(MANUAL_HOME_KEY);

    if (isManual) {
      const url = new URL(window.location.href);
      url.searchParams.delete(MANUAL_HOME_KEY);
      window.history.replaceState(null, "", url.pathname + url.search);
      decidedRef.current = true;
      return;
    }

    if (isAuthenticated) {
      decidedRef.current = true;
      router.replace(getAuthenticatedHomeRoute(role));
    }
  }, [hydrated, isAuthenticated, role, router]);

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

  return (
    <>
      <Header />
      <main className="h-[var(--app-vh,100dvh)] bg-background text-foreground">
        <HeroSection
          support={{ phone: support.phone, whatsapp: support.whatsapp }}
        />
        <AboutSection />
        <ServicesSection services={services} />
        {!isAuthenticated && (
          <RequestAccountSection
            support={{ email: support.email, whatsapp: support.whatsapp }}
          />
        )}
        <ContactSection support={support} />
        <FooterSection support={support} isAuthenticated={isAuthenticated} />
      </main>
    </>
  );
}
