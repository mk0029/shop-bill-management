import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { getSupportContact } from "@/lib/auth-service";

export const metadata: Metadata = { title: "Contact", description: "Contact Jambh Electrics by phone, WhatsApp, email, or form." };

export default function ContactPage() {
  const support = getSupportContact();
  return (
    <LandingShell title="Contact Jambh Electrics" copy="Reach us for service, product, account, or payment support.">
      <section className="container mx-auto grid gap-4 px-4 py-12 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-300"><p>Phone: {support.phone}</p><p className="mt-2">WhatsApp: {support.whatsapp}</p><p className="mt-2">Email: {support.email}</p><p className="mt-2">Address: VPO Lilas, Siwani, Haryana</p><p className="mt-2">Working Hours: 8:00 AM - 8:00 PM</p><div className="mt-4 flex gap-2"><a href={`tel:${support.phone}`} className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950">Call Now</a><a href={`https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}`} className="rounded-md border border-sky-500 px-3 py-2 text-sm">WhatsApp</a></div></div>
        <form className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><h2 className="text-lg font-semibold">Contact Form</h2><div className="mt-4 space-y-3"><input className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Name" /><input className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Phone" /><textarea className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" rows={5} placeholder="How can we help?" /><button type="button" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">Submit</button></div></form>
      </section>
    </LandingShell>
  );
}
