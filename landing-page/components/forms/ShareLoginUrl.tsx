"use client";

import { useState } from "react";
import { MessageCircle, Mail, Share2 } from "lucide-react";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";

function siteUrl() {
  return (
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jambh-ell.vercel.app"
  ).replace(/\/+$/, "");
}

export function ShareLoginUrl({
  support,
}: {
  support: { email: string; whatsapp: string };
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLandingLanguage();

  const buildLoginUrl = () => {
    const base = siteUrl();
    return `${base}/login?phone=${encodeURIComponent(phone)}&passKey=${encodeURIComponent(secretKey)}`;
  };

  const buildMessage = () => {
    const safeName = name.trim() || "Customer";
    const loginUrl = buildLoginUrl();
    const contact = support.phone || support.email || t("share.contactDefault");
    return [
      `🎉 Welcome, ${safeName}!`,
      "Your account is ready. Explore products, request services, track updates, and connect with our team—all in one place.",
      "",
      `🎉 स्वागत है, ${safeName}!`,
      "आपका अकाउंट तैयार है। अब आप उत्पाद देख सकते हैं, सेवाओं का अनुरोध कर सकते हैं, अपडेट ट्रैक कर सकते हैं और हमारी टीम से जुड़ सकते हैं — सब कुछ एक ही जगह पर।",
      "",
      "🔐 Your Secure Account:",
      `Click the link below to log in and view your bills, place orders, and much more:`,
      loginUrl,
      "",
      "📞 Need help?",
      `Contact us: ${contact}`,
      "",
      "Thank you for choosing Us",
    ].join("\n");
  };

  const handleWhatsApp = () => {
    setError("");
    if (!phone.trim() || !secretKey.trim()) {
      setError(t("share.validationRequired"));
      return;
    }
    const encoded = encodeURIComponent(buildMessage());
    const waPhone = support.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${waPhone}?text=${encoded}`, "_blank");
  };

  const handleEmail = async () => {
    setError("");
    if (!phone.trim() || !secretKey.trim()) {
      setError(t("share.validationRequired"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: support.email,
          subject: t("share.emailSubject"),
          text: buildMessage(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("form.channelError"));
      }
    } catch {
      setError(t("form.channelError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-4 w-4 text-sky-400" />
        <h3 className="text-base font-semibold text-white">
          {t("share.title")}
        </h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#E5E7EB]">
            {t("share.customerName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("share.customerNamePlaceholder")}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E5E7EB]">
              {t("share.customerPhone")}
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("share.customerPhonePlaceholder")}
              required
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E5E7EB]">
              {t("share.secretKey")}
            </label>
            <input
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={t("share.secretKeyPlaceholder")}
              required
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="glass-button-primary flex-1 rounded-xl h-10 text-sm font-semibold text-sky-200 inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {t("share.sendWhatsApp")}
          </button>
          <button
            type="button"
            onClick={handleEmail}
            disabled={isLoading}
            className="glass-button flex-1 rounded-xl h-10 text-sm font-semibold text-[#E5E7EB] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {isLoading ? t("form.submitting") : t("share.sendEmail")}
          </button>
        </div>
      </div>
    </div>
  );
}
