"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ShieldCheck,
  Wrench,
  BadgeCheck,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";

export default function AboutSection() {
  return (
    <section id="about" className="container mx-auto px-4 py-11 md:py-20">
      {/* Section 1: About Us (Split Layout) */}
      <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
        <div>
          <p className="text-base tracking-wider uppercase text-primary/80 font-medium">
            About Us
          </p>
          <h2 className="mt-2 text-2xl md:text-4xl font-bold leading-tight">
            Trusted electrical service with years of hands‑on experience
          </h2>
          <p className="mt-4 text-muted-foreground">
            We are a professional electrical shop serving homes and small
            businesses. Our skilled technicians handle installations, repairs,
            and upgrades with a safety‑first approach. We believe in clear
            advice, neat workmanship, and honest pricing you can rely on.
          </p>
        </div>
        <div>
          <div className="relative overflow-hidden rounded-xl bg-muted aspect-video shadow-sm">
            <Image
              fill
              src="/img/about.webp"
              alt="Electrician working safely on an electrical panel"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Why Choose Us (Cards) */}
      <div className="mt-16 md:mt-24">
        <div className="text-center">
          <p className="text-base tracking-wider uppercase text-primary/80 font-medium">
            Why Us
          </p>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold leading-tight">
            Quality work, reliable timelines, and genuine pricing
          </h3>
          <p className="mt-4 text-muted-foreground max-w-[708px] mx-auto">
            From small fixes to complete rewiring, we plan carefully and work
            safely. Our team brings the right tools and proven methods to
            deliver dependable results.
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Experienced electricians
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Trained technicians for residential and small business jobs.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Quality workmanship
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Neat installations and repairs that meet safety standards.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  On‑time service
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Scheduled visits and timely completion of work.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Genuine pricing
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Transparent quotes with no hidden charges.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Safe practices
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Work completed to safety codes with proper isolation, earthing,
                and testing.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Quality materials
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Reputed brands and genuine parts for reliable, long‑lasting
                performance.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Wrench className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Skilled workmanship
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Careful routing, neat terminations, and labeled circuits for
                clarity.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                <h4 className="font-semibold text-lg md:text-xl">
                  Clear communication
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Upfront estimates, simple explanations, and regular progress
                updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
