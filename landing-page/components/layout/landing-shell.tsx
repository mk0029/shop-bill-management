import Header from "@landing/components/home/Header";
import { FooterSection, SectionTitle, PremiumCard } from "@landing/components/shared/landing-sections";
import { getSupportContact } from "@/lib/auth-service";
import { services } from "@landing/lib/site-data";
import Link from "next/link";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";

export function LandingShell({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  const support = getSupportContact();
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-slate-800 bg-slate-900/40"><div className="container mx-auto px-4 py-12"><SectionTitle title={title} copy={copy} /></div></section>
        {children}
        <FooterSection support={support} />
      </main>
    </>
  );
}

export function ServicesGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((item) => (
        <PremiumCard key={item.slug}><item.icon className="h-7 w-7 text-sky-300" /><h3 className="mt-3 text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-slate-300">{item.shortDescription}</p><Link href={`/services/${item.slug}`} className="mt-4 inline-block text-sm text-sky-300">View Details</Link></PremiumCard>
      ))}
    </div>
  );
}

export function RequestAccountBlock() {
  const support = getSupportContact();
  return <div className="mx-auto max-w-4xl"><RequestAccountForm support={{ email: support.email, whatsapp: support.whatsapp }} /></div>;
}
