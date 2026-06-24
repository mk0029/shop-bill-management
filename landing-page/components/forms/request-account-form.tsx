"use client";

import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { locationOptions } from "@/app/admin/tools/fitting-items/constants";
import { MessageCircle, Mail, Send } from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

export function RequestAccountForm({ support, compact = false }: { support: { email: string; whatsapp: string }; compact?: boolean }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", customLocation: "", requirement: "", channel: "whatsapp" as "whatsapp" | "email" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLandingLanguage();

  const displayOptions = [...locationOptions, { value: "other", label: t("form.other") }];

  const resolvedLocation = form.location === "other" ? form.customLocation.trim() : form.location;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !resolvedLocation) {
      setError(t("form.validationRequired"));
      return;
    }

    const summary = `${t("form.summaryTitle")}\n${t("form.summaryName")}: ${form.name}\n${t("form.summaryPhone")}: ${form.phone}\n${t("form.summaryEmail")}: ${form.email}\n${t("form.summaryLocation")}: ${resolvedLocation}\n${t("form.summaryContactPreference")}: ${form.channel}\n${t("form.summaryRequirement")}: ${form.requirement || "-"}`;

    setIsLoading(true);
    try {
      if (form.channel === "whatsapp") {
        const encoded = encodeURIComponent(summary);
        const phone = support.whatsapp.replace(/\D/g, "");
        const waLink = phone
          ? `https://wa.me/${phone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`;
        window.open(waLink, "_blank");
        setForm({ name: "", phone: "", email: "", location: "", customLocation: "", requirement: "", channel: "whatsapp" });
      } else {
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: support.email,
            subject: t("form.requestSubject"),
            text: summary,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || t("form.channelError"));
        } else {
          setSuccess(t("form.emailSuccess"));
          setForm({ name: "", phone: "", email: "", location: "", customLocation: "", requirement: "", channel: "whatsapp" });
        }
      }
    } catch {
      setError(t("form.channelError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label={t("form.aria")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ra-name" className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">{t("form.fullName")}</label>
          <input id="ra-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("form.fullNamePlaceholder")} required
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
          />
        </div>
        <div>
          <label htmlFor="ra-phone" className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">{t("form.phoneNumber")}</label>
          <input id="ra-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("form.phonePlaceholder")} required
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ra-email" className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">{t("form.emailAddress")}</label>
          <input id="ra-email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={t("form.emailPlaceholder")} required
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">{t("form.location")}</label>
          <Dropdown options={displayOptions} value={form.location} onValueChange={(value) => setForm((f) => ({ ...f, location: value }))} placeholder={t("form.locationPlaceholder")} />
          {form.location === "other" && (
            <input
              value={form.customLocation}
              onChange={(e) => setForm((f) => ({ ...f, customLocation: e.target.value }))}
              placeholder={t("form.customLocationPlaceholder")}
              required
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50 mt-2"
            />
          )}
          <input className="hidden" readOnly required value={resolvedLocation} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-[#E5E7EB]">{t("form.contactPreference")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, channel: "whatsapp" }))}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
              form.channel === "whatsapp"
                ? "glass-button-primary text-sky-200 border-sky-400/30"
                : "glass-button text-[#B8C0CC] border-white/10 hover:text-white"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {t("form.whatsapp")}
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, channel: "email" }))}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
              form.channel === "email"
                ? "glass-button-primary text-sky-200 border-sky-400/30"
                : "glass-button text-[#B8C0CC] border-white/10 hover:text-white"
            }`}
          >
            <Mail className="h-4 w-4" />
            {t("form.email")}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="ra-req" className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">{t("form.serviceRequirement")}</label>
        <textarea id="ra-req" value={form.requirement} onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))} placeholder={t("form.serviceRequirementPlaceholder")} rows={compact ? 3 : 5}
          className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50 resize-none"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-green-400 bg-green-950/40 rounded-xl px-4 py-3 border border-green-500/20 leading-relaxed">{success}</p> : null}
      <button
        type="submit"
        disabled={isLoading}
        className="glass-button-primary w-full rounded-xl h-11 text-sm font-semibold text-sky-200 disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {t("form.submitting")}
          </span>
        ) : form.channel === "whatsapp" ? (
          <><MessageCircle className="h-4 w-4" />{t("form.sendWhatsapp")}</>
        ) : (
          <><Send className="h-4 w-4" />{t("form.sendEmail")}</>
        )}
      </button>
    </form>
  );
}
