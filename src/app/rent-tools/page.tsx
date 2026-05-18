import { Metadata } from "next";
import { LandingShell } from "@landing/components/layout/landing-shell";

export const metadata: Metadata = { title: "Rent Tools", description: "Electrical tool rental from Jambh Electrics." };

export default function RentToolsPage() {
  return (
    <LandingShell title="Need Electrical Tools on Rent?" copy="Hourly/day rental with advance payment and return-condition policy.">
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Rental Pricing</h2>
            <p className="mt-3 text-sky-300">Hourly: ₹100 - ₹200</p>
            <p className="text-sky-300">Daily: ₹500 - ₹700</p>
            <p className="mt-4 text-sm text-slate-300">
              Rates are dynamic based on tool type, condition, and usage.
              Final rent can be lower or higher depending on the selected tool.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Tool handover happens after advance payment. Borrower is
              responsible for delay, damage, or loss.
            </p>
          </div>
          <form className="rounded-xl border border-slate-700 bg-slate-900/70 p-6"><h2 className="text-lg font-semibold">Request Tool Rental</h2><div className="mt-4 space-y-3"><input className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Your name" /><input className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Phone" /><select className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm"><option>Tool selector (placeholder)</option></select><textarea className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm" rows={4} placeholder="Duration, date, and notes" /><button type="button" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">Request Tool on Rent</button></div></form>
        </div>
      </section>
    </LandingShell>
  );
}
