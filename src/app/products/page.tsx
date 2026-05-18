import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { CircleCheck, ShieldCheck, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Products",
  description: "Electrical product categories from Jambh Electrics.",
};

const categories = [
  { title: "Switches", details: "Modular and heavy-duty switches for home and shop installations." },
  { title: "Sockets", details: "Multi-amp and appliance sockets with safe fitting support." },
  { title: "Wires", details: "House wiring cables for lighting, power, and load-specific setups." },
  { title: "Lights", details: "LED bulbs, panels, and fixtures with energy-efficient options." },
  { title: "MCB", details: "Protection devices for overload and short-circuit safety." },
  { title: "Boards", details: "Distribution and switch boards for structured electrical points." },
  { title: "Accessories", details: "Clips, holders, connectors, tapes, and fitting accessories." },
];

export default function ProductsPage() {
  return (
    <LandingShell title="Electrical Product Categories" copy="Browse common categories with clear guidance on quality, warranty, and fitment support.">
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.details}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
            <p className="flex items-center gap-2 text-sky-300"><CircleCheck className="h-4 w-4" /> Quality Clarification</p>
            <p className="mt-2 text-sm text-slate-300">We help you choose suitable quality based on load, usage frequency, and budget.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
            <p className="flex items-center gap-2 text-sky-300"><ShieldCheck className="h-4 w-4" /> Warranty Clarification</p>
            <p className="mt-2 text-sm text-slate-300">Warranty depends on manufacturer/supplier policy and product condition.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
            <p className="flex items-center gap-2 text-sky-300"><Truck className="h-4 w-4" /> Visit & Fitment Charges</p>
            <p className="mt-2 text-sm text-slate-300">Fixed visit charge applies for all service visits. Fitting/labor charges are shared before work.</p>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
