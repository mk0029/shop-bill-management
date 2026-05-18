"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, ShieldCheck, BadgeCheck, HandCoins, Timer } from "lucide-react";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";

export function HeroSection({ support }: { support: { phone: string; whatsapp: string } }) {
  return (
    <section id="home" className="relative overflow-hidden border-b border-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,0.16),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.14),transparent_34%)]" />
      <div className="container relative mx-auto grid items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-2">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-sky-300">Jambh Electrics</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">Trusted Electrical Products and Expert Home Services</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">Fair pricing, skilled technicians, and fast support for homes and local businesses. From repairs to complete wiring, we keep safety first.</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <Button className="h-11 w-full bg-sky-500 text-base font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto" onClick={() => shareToWhatsAppApp({ text: "Hello! I need electrical service.", phone: support.whatsapp })}>
              <MessageCircle className="mr-2 h-4 w-4" /> Get Service
            </Button>
            <Button variant="secondary" className="h-11 w-full text-base font-semibold sm:w-auto" onClick={() => window.open(`tel:${support.phone}`, "_blank")}> <Phone className="mr-2 h-4 w-4" /> Call Now </Button>
            <Link href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" className="h-11 w-full border-sky-600 text-base font-semibold text-sky-200 hover:bg-sky-900/40 sm:w-auto">WhatsApp</Button>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ icon: BadgeCheck, label: "Skilled Electricians" }, { icon: ShieldCheck, label: "Safety First" }, { icon: HandCoins, label: "Genuine Pricing" }, { icon: Timer, label: "Fast Support" }].map((badge) => (
              <div key={badge.label} className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-[15px] text-slate-100 sm:text-base">
                <badge.icon className="h-5 w-5 text-sky-300" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-3xl bg-sky-500/15 blur-3xl" />
          <div className="relative rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl">
            <Image src="/je-p-512.png" alt="Jambh Electrics logo" width={210} height={210} className="mx-auto" priority />
            <div className="mt-5 space-y-3">
              <p className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">Reliable service planning and transparent estimate discussion.</p>
              <p className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">Emergency and late-night support based on safety and technician availability.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.16em] text-sky-300">{eyebrow}</p> : null}
      <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">{title}</h2>
      {copy ? <p className="mt-3 text-base text-slate-300">{copy}</p> : null}
    </div>
  );
}

export function PremiumCard({ children }: { children: React.ReactNode }) {
  return <article className="h-full rounded-xl border border-slate-700 bg-slate-900/70 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-[0_0_18px_rgba(14,165,233,0.18)]">{children}</article>;
}

export function FooterSection({ support }: { support: { phone: string; whatsapp: string; email: string } }) {
  const serviceLinks = ["Home Electrical Service", "Product Sales", "New Wiring", "Fault Detection", "Appliance Repair", "Tool Rental"];

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-1">
            <h3 className="text-2xl font-semibold text-white">Jambh Electrics</h3>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">Trusted electrical products and expert home services with transparent pricing.</p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white">Quick Links</h4>
            <ul className="mt-4 space-y-2.5 text-base text-slate-300">
              <li><Link href="/about" className="hover:text-white">About</Link></li>
              <li><Link href="/services" className="hover:text-white">Services</Link></li>
              <li><Link href="/products" className="hover:text-white">Products</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white">Services</h4>
            <ul className="mt-4 space-y-2.5 text-base text-slate-300">{serviceLinks.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white">Contact & Policies</h4>
            <ul className="mt-4 space-y-2.5 text-base text-slate-300">
              <li><a href={`tel:${support.phone}`} className="hover:text-white">{support.phone}</a></li>
              <li><a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="hover:text-white">WhatsApp: {support.whatsapp}</a></li>
              <li><a href={`mailto:${support.email}`} className="hover:text-white">{support.email}</a></li>
              <li>Working Hours: 8:00 AM - 8:00 PM</li>
              <li className="pt-2"><Link href="/terms" className="hover:text-white">Terms</Link> · <Link href="/privacy-policy" className="hover:text-white">Privacy</Link> · <Link href="/refund-policy" className="hover:text-white">Refund</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-400">(c) {new Date().getFullYear()} Jambh Electrics. All rights reserved.</div>
    </footer>
  );
}
