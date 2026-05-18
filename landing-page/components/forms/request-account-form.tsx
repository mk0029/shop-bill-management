"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import { locationOptions } from "@/app/admin/tools/fitting-items/constants";
import { MessageCircle, Mail } from "lucide-react";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";

export function RequestAccountForm({ support, compact = false }: { support: { email: string; whatsapp: string }; compact?: boolean }) {
  const [form, setForm] = useState({ name: "", phone: "", location: "", requirement: "", channel: "whatsapp" as "whatsapp" | "email" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.phone.trim() || !form.location.trim()) {
      setError("Please fill name, phone, and location.");
      return;
    }

    const summary = `Customer Account Request\nName: ${form.name}\nPhone: ${form.phone}\nLocation: ${form.location}\nContact Preference: ${form.channel}\nRequirement: ${form.requirement || "-"}`;

    setIsLoading(true);
    try {
      if (form.channel === "whatsapp") {
        await shareToWhatsAppApp({ text: summary, phone: support.whatsapp });
      } else {
        const subject = encodeURIComponent("Customer Account Request");
        const body = encodeURIComponent(summary);
        window.open(`mailto:${support.email}?subject=${subject}&body=${body}`, "_blank");
      }
      setSuccess("Request prepared successfully. Our team will connect with you soon.");
    } catch {
      setError("Could not open selected channel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-5 md:p-6" aria-label="Request account form">
      <div className="grid gap-4 md:grid-cols-2">
        <div><label htmlFor="ra-name" className="mb-1 block text-sm text-slate-200">Full Name</label><Input id="ra-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" required /></div>
        <div><label htmlFor="ra-phone" className="mb-1 block text-sm text-slate-200">Phone Number</label><Input id="ra-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 9876543210" required /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="mb-1 block text-sm text-slate-200">Location</label><Dropdown options={locationOptions} value={form.location} onValueChange={(value) => setForm((f) => ({ ...f, location: value }))} placeholder="Select location" /><Input className="hidden" readOnly required value={form.location} /></div>
        <div>
          <p className="mb-1 text-sm text-slate-200">Contact Preference</p>
          <div className="flex gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2"><input type="radio" name="channel" checked={form.channel === "whatsapp"} onChange={() => setForm((f) => ({ ...f, channel: "whatsapp" }))} /> WhatsApp</label>
            <label className="flex items-center gap-2"><input type="radio" name="channel" checked={form.channel === "email"} onChange={() => setForm((f) => ({ ...f, channel: "email" }))} /> Email</label>
          </div>
        </div>
      </div>
      <div><label htmlFor="ra-req" className="mb-1 block text-sm text-slate-200">Service Requirement</label><Textarea id="ra-req" value={form.requirement} onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))} placeholder="Tell us what you need" rows={compact ? 3 : 5} /></div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <Button type="submit" disabled={isLoading} className="bg-sky-500 text-slate-950 hover:bg-sky-400">{isLoading ? "Submitting..." : form.channel === "whatsapp" ? <><MessageCircle className="mr-2 h-4 w-4" />Send on WhatsApp</> : <><Mail className="mr-2 h-4 w-4" />Send via Email</>}</Button>
    </form>
  );
}
