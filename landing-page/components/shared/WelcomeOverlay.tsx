"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

export default function WelcomeOverlay({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [visibleLine, setVisibleLine] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const [hindiVisibleLine, setHindiVisibleLine] = useState(0);

  useEffect(() => {
    const fullText = "welcomes you";
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => setShowIntro(true), 500);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => setShowDetails(true), 600);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  useEffect(() => {
    if (!showDetails) return;
    const t = setTimeout(() => setShowButton(true), 400 + 5 * 250);
    return () => clearTimeout(t);
  }, [showDetails]);

  useEffect(() => {
    if (!showDetails) {
      setVisibleLine(0);
      return;
    }
    if (visibleLine >= 5) return;
    const t = setTimeout(() => setVisibleLine((p) => p + 1), 250);
    return () => clearTimeout(t);
  }, [showDetails, visibleLine]);

  useEffect(() => {
    if (!showHindi) {
      setHindiVisibleLine(0);
      return;
    }
    if (hindiVisibleLine >= 5) return;
    const t = setTimeout(() => setHindiVisibleLine((p) => p + 1), 250);
    return () => clearTimeout(t);
  }, [showHindi, hindiVisibleLine]);

  const handleContinue = () => {
    try {
      localStorage.setItem("jambh_landing_welcome_seen", "true");
    } catch {}
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D12]">
      <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-start px-4 py-[max(2.5rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:justify-center">
          <div className="glass-card w-full max-w-lg p-4 sm:p-6 md:p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/je-p-48.png"
            alt="Jambh Electrics"
            width={80}
            height={80}
            className="opacity-90"
            priority
          />
        </div>
        <h1 className="mt-2 text-center text-[26px] font-bold leading-tight text-white sm:text-4xl">
          <span className="block bg-[linear-gradient(90deg,#38bdf8,#f59e0b,#22c55e,#38bdf8)] bg-[length:260%_100%] bg-clip-text text-transparent motion-safe:animate-[welcome-gradient_7s_ease-in-out_infinite]">
            Jambh Electricals Lilas
          </span>
        </h1>

        <h2 className="mt-1 text-center text-xl font-bold text-white min-h-[1.75rem]">
          {typedText}
          <span className="animate-pulse text-sky-400">|</span>
        </h2>

        <div
          className={`transition-all duration-500 overflow-hidden ${
            showIntro ? "max-h-40 opacity-100 mt-5" : "max-h-0 opacity-0"
          }`}
        >
          <p className="text-sm text-[#B8C0CC] leading-relaxed text-center">
            This website helps customers explore our electrical services,
            product sales, pricing notes, contact options, and service requests.
          </p>
        </div>

        <div
          className={`transition-all duration-500 overflow-hidden ${
            showDetails ? "max-h-[500px] opacity-100 mt-5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="glass rounded-xl border border-white/5 relative overflow-hidden">
            {/* EN block – slides left out, fades */}
            <div
              className={`p-4 transition-all duration-500 ${
                showHindi
                  ? "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                  : "translate-x-0 opacity-100 relative"
              }`}
            >
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-2">
                Development Note
              </p>
              <ul className="space-y-2 text-sm text-[#B8C0CC]">
                {[
                  "Website is currently under development.",
                  "If you notice any bug, glitch, wrong text, broken button, or layout issue, directly contact the shop on WhatsApp.",
                  "Drop a message about the bug and we will resolve it ASAP.",
                  "Prices, service charges, product rates, and content shown on the website are not final yet.",
                  "Final charges may change based on work, product brand, location, availability, and inspection.",
                ].map((text, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 transition-all duration-500 ${
                      idx < visibleLine
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-4 pointer-events-none"
                    }`}
                  >
                    <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* HI block – slides in from right */}
            <div
              className={`p-4 transition-all duration-500 ${
                showHindi
                  ? "translate-x-0 opacity-100 relative"
                  : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              }`}
            >
              <p className="text-xs text-sky-400/70 font-semibold uppercase tracking-wider mb-2">
                विकास नोट
              </p>
              <ul className="space-y-2 text-sm text-[#B8C0CC]">
                {[
                  "वेबसाइट वर्तमान में विकास के अंतर्गत है।",
                  "यदि आपको कोई बग, गड़बड़ी, गलत टेक्स्ट, टूटा हुआ बटन या लेआउट की समस्या दिखे, तो सीधे WhatsApp पर संपर्क करें।",
                  "बग के बारे में संदेश भेजें और हम इसे जल्द से जल्द ठीक करेंगे।",
                  "कीमतें, सेवा शुल्क, उत्पाद दरें और वेबसाइट पर दिखाई गई सामग्री अंतिम नहीं है।",
                  "अंतिम शुल्क कार्य, उत्पाद ब्रांड, स्थान, उपलब्धता और निरीक्षण के आधार पर बदल सकते हैं।",
                ].map((text, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 transition-all duration-500 ${
                      idx < hindiVisibleLine
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-4 pointer-events-none"
                    }`}
                  >
                    <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Toggle arrow – moves from right edge to left edge */}
            <button
              type="button"
              onClick={() => setShowHindi((p) => !p)}
              className={`absolute top-1/2 -translate-y-1/2 z-10 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-sky-400 hover:bg-white/20 transition-all duration-500 ${
                showHindi
                  ? "left-0 -translate-x-1/2  w-7"
                  : "right-0 translate-x-1/2  w-8"
              }`}
              aria-label="Toggle language"
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform duration-500 ${
                  showHindi ? "rotate-180 translate-x-1.5" : "-translate-x-1.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div
          className={`transition-all duration-500 ${
            showButton
              ? "opacity-100 mt-6 pointer-events-auto"
              : "opacity-0 mt-6 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={handleContinue}
            className="glass-button-primary w-full py-3 rounded-2xl text-base font-semibold text-sky-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Continue
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
