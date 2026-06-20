"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dropdown } from "@/components/ui/dropdown";
import { locationOptions } from "@/app/admin/tools/fitting-items/constants";
import { MessageCircle, Mail } from "lucide-react";
import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

export function RequestAccountForm({ support, compact = false }: { support: { email: string; whatsapp: string }; compact?: boolean }) {
  const [form, setForm] = useState({ name: "", phone: "", location: "", requirement: "", channel: "whatsapp" as "whatsapp" | "email" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLandingLanguage();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.phone.trim() || !form.location.trim()) {
      setError(t("form.validationRequired"));
      return;
    }

    const summary = `${t("form.summaryTitle")}\n${t("form.summaryName")}: ${form.name}\n${t("form.summaryPhone")}: ${form.phone}\n${t("form.summaryLocation")}: ${form.location}\n${t("form.summaryContactPreference")}: ${form.channel}\n${t("form.summaryRequirement")}: ${form.requirement || "-"}`;

    setIsLoading(true);
    try {
      if (form.channel === "whatsapp") {
        await shareToWhatsAppApp({ text: summary, phone: support.whatsapp });
      } else {
        const subject = encodeURIComponent(t("form.requestSubject"));
        const body = encodeURIComponent(summary);
        window.open(`mailto:${support.email}?subject=${subject}&body=${body}`, "_blank");
      }
      setSuccess(t("form.success"));
    } catch {
      setError(t("form.channelError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-5 md:p-6" aria-label={t("form.aria")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label htmlFor="ra-name" className="mb-1 block text-sm text-slate-200">{t("form.fullName")}</label><Input id="ra-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("form.fullNamePlaceholder")} required /></div>
        <div><label htmlFor="ra-phone" className="mb-1 block text-sm text-slate-200">{t("form.phoneNumber")}</label><Input id="ra-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("form.phonePlaceholder")} required /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="mb-1 block text-sm text-slate-200">{t("form.location")}</label><Dropdown options={locationOptions} value={form.location} onValueChange={(value) => setForm((f) => ({ ...f, location: value }))} placeholder={t("form.locationPlaceholder")} /><Input className="hidden" readOnly required value={form.location} /></div>
        <div>
          <p className="mb-1 text-sm text-slate-200">{t("form.contactPreference")}</p>
          <div className="flex gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2"><input type="radio" name="channel" checked={form.channel === "whatsapp"} onChange={() => setForm((f) => ({ ...f, channel: "whatsapp" }))} /> {t("form.whatsapp")}</label>
            <label className="flex items-center gap-2"><input type="radio" name="channel" checked={form.channel === "email"} onChange={() => setForm((f) => ({ ...f, channel: "email" }))} /> {t("form.email")}</label>
          </div>
        </div>
      </div>
      <div><label htmlFor="ra-req" className="mb-1 block text-sm text-slate-200">{t("form.serviceRequirement")}</label><Textarea id="ra-req" value={form.requirement} onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))} placeholder={t("form.serviceRequirementPlaceholder")} rows={compact ? 3 : 5} /></div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <Button type="submit" disabled={isLoading} className="bg-sky-500 text-slate-950 hover:bg-sky-400">{isLoading ? t("form.submitting") : form.channel === "whatsapp" ? <><MessageCircle className="mr-2 h-4 w-4" />{t("form.sendWhatsapp")}</> : <><Mail className="mr-2 h-4 w-4" />{t("form.sendEmail")}</>}</Button>
    </form>
  );
}
