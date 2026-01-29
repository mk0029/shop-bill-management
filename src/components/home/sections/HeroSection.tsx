"use client";

import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  Home,
  BadgeCheck,
  ShieldCheck,
  Bolt,
} from "lucide-react";
import Image from "next/image";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";

export default function HeroSection({
  support,
}: {
  support: { phone: string; whatsapp: string };
}) {
  return (
    <section className="relative overflow-hidden" id="home">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="container mx-auto px-4 py-14 md:py-28 relative">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Quality Electrical Products & Expert Home Services
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              From switches and wires to complete wiring, appliance repairs and
              fault fixing — professional, fast and fairly priced.
            </p>
            <div className="mt-6 flex  gap-3">
              <Button
                className="max-sm:!px-2 max-sm:w-full"
                size="lg"
                onClick={() => {
                  const msg = "Hello! I need electrical service.";
                  shareToWhatsAppApp({
                    text: msg,
                    phone: support.whatsapp,
                  }).catch(() => {});
                }}
              >
                <MessageCircle className="mr-2 h-5 w-5" /> Get Service
              </Button>
              <Button
                className="max-sm:!px-2 max-sm:w-full"
                size="lg"
                variant="secondary"
                onClick={() => window.open(`tel:${support.phone}`, "_blank")}
              >
                <Phone className="mr-2 h-5 w-5" /> Call for Inspection
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <p className="flex items-center gap-2 text-base">
                <BadgeCheck className="size-6 text-primary" /> Skilled
                Technicians
              </p>
              <p className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-6 text-primary" /> Safety First
              </p>
              <p className="flex items-center gap-2 text-base">
                <Bolt className="size-6 text-primary" /> Fast Service
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-xl bg-gray-900 border border-border flex items-center justify-center relative">
              {/* <Home className="h-16 w-16 text-primary" /> */}
              <Image
                alt="home"
                src="/je-p-512.png"
                fill
                className="w-full h-auto absolute top-0 left-0 z-10 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
