"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BatteryCharging,
  Cable,
  CheckCircle2,
  Fan,
  FileText,
  Lightbulb,
  MessageCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Wrench,
  Zap,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sanitizeUserText } from "@/constants/defaults";
import { useDynamicViewportHeight } from "@/hooks/use-dynamic-viewport-height";
import { useAuthStore } from "@/store/auth-store";

const GUIDE_SEEN_PREFIX = "customer_welcome_guide_seen";

const floatingItems = [
  { label: "Wire", icon: Cable, x: "7%", y: "14%", delay: 0, duration: 15 },
  { label: "Switch", icon: ToggleLeft, x: "82%", y: "13%", delay: 1.3, duration: 17 },
  { label: "Plug", icon: Plug, x: "16%", y: "72%", delay: 0.8, duration: 18 },
  { label: "Bulb", icon: Lightbulb, x: "70%", y: "70%", delay: 1.8, duration: 16 },
  { label: "Fan", icon: Fan, x: "45%", y: "8%", delay: 0.4, duration: 20 },
  { label: "Motor", icon: Zap, x: "90%", y: "45%", delay: 2.4, duration: 19 },
  { label: "Tools", icon: Wrench, x: "6%", y: "48%", delay: 1.9, duration: 16 },
  { label: "Battery", icon: BatteryCharging, x: "43%", y: "84%", delay: 1.1, duration: 18 },
];

const quickActions = [
  { label: "Service requests", icon: Wrench },
  { label: "Work progress", icon: Zap },
  { label: "Bills & payments", icon: FileText },
  { label: "Shop chat", icon: MessageCircle },
];

const welcomeLine =
  "Your customer dashboard is ready. Manage service updates, bills, repair requests, shop chat, and important notifications from one place.";

const englishDetails = [
  "Create a repair or service request with clear issue details, location preference, and any helpful notes for the shop team.",
  "Follow your work progress from request received to assigned, in progress, completed, or on hold without calling repeatedly.",
  "Review bills, payment status, pending balance, and service history in a clean record whenever you need it.",
  "Use chat for support, photos, clarifications, estimates, and quick communication with the shop or admin team.",
  "Check notifications for important updates such as new bills, service progress, payment reminders, and chat replies.",
  "If technician selection is available, choose the preferred mechanic or technician shown for your service request.",
];

const hindiDetails = [
  "Repair या service request में समस्या, location preference और जरूरी notes साफ तरीके से भेजें ताकि shop team जल्दी समझ सके.",
  "काम का status request received से assigned, in progress, completed या on hold तक app में आसानी से देखें.",
  "Bills, payment status, pending balance और service history कभी भी साफ record में check करें.",
  "Shop/admin से chat करके support, photos, clarification, estimate और quick updates लें.",
  "Notifications में new bill, service progress, payment reminder और chat reply जैसे जरूरी updates देखें.",
  "Technician selection उपलब्ध हो तो अपनी service request के लिए preferred mechanic या technician चुनें.",
];

function seenKey(userId?: string) {
  return `${GUIDE_SEEN_PREFIX}:${userId || "guest"}`;
}

function markSeen(userId?: string) {
  try {
    window.localStorage.setItem(seenKey(userId), "1");
  } catch {}
}

function hasSeen(userId?: string) {
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function FloatingBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_16%,rgba(14,165,233,0.32),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(249,115,22,0.26),transparent_26%),radial-gradient(circle_at_52%_85%,rgba(34,197,94,0.16),transparent_25%),linear-gradient(135deg,#020617,#071426_48%,#111827)]">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,transparent_0_46%,rgba(59,130,246,0.24)_47%,transparent_49%_100%)] [background-size:220px_140px]" />
      {floatingItems.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            className="absolute grid h-14 w-14 place-items-center rounded-full border border-sky-200/20 bg-slate-950/55 text-blue-100 shadow-lg shadow-black/25 backdrop-blur-md sm:h-16 sm:w-16"
            style={{ left: item.x, top: item.y }}
            initial={false}
            animate={
              reducedMotion
                ? { opacity: 0.45 }
                : {
                    y: [0, -18, 10, 0],
                    x: [0, 10, -8, 0],
                    rotate: [0, 5, -4, 0],
                    opacity: [0.38, 0.68, 0.5, 0.38],
                  }
            }
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: reducedMotion ? 0 : Infinity,
              ease: "easeInOut",
            }}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </motion.div>
        );
      })}
      <motion.div
        className="absolute left-0 top-[44%] h-px w-full bg-gradient-to-r from-transparent via-sky-300/70 to-transparent"
        animate={
          reducedMotion
            ? { opacity: 0.35 }
            : { x: ["-45%", "45%"], opacity: [0, 0.7, 0] }
        }
        transition={{
          duration: 4.8,
          repeat: reducedMotion ? 0 : Infinity,
          ease: "easeInOut",
        }}
        aria-hidden="true"
      />
      <div className="absolute left-[25%] top-[28%] text-5xl font-semibold text-sky-200/10">AC</div>
      <div className="absolute right-[24%] top-[32%] text-4xl font-semibold text-orange-200/10">+ -</div>
      <div className="absolute bottom-[18%] left-[30%] text-4xl font-semibold text-blue-200/10">GND</div>
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[5px]" />
    </div>
  );
}

function TypewriterLine({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(reducedMotion ? text : "");

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [reducedMotion, text]);

  return (
    <p className="min-h-[4.75rem] max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
      {displayed}
      {!reducedMotion && displayed.length < text.length && (
        <span className="ml-1 inline-block h-5 w-0.5 translate-y-1 bg-orange-300" />
      )}
    </p>
  );
}

function GuideCard({
  title,
  greeting,
  details,
  safety,
  className = "",
}: {
  title: string;
  greeting: string;
  details: string[];
  safety: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-slate-950/75 p-4 shadow-xl shadow-black/20 backdrop-blur-2xl sm:p-5 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-normal text-blue-100">
        {title}
      </h3>
      <p className="mt-3 text-base font-semibold text-white">{greeting}</p>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-200">
        {details.map((detail) => (
          <div key={detail} className="flex gap-2">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sky-300" />
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2 rounded-md border border-orange-300/20 bg-orange-400/10 p-3 text-sm text-orange-50">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
        <span>{safety}</span>
      </div>
    </div>
  );
}

export default function CustomerWelcomeGuide({
  mode = "gate",
}: {
  mode?: "gate" | "page";
}) {
  useDynamicViewportHeight({ shellClassName: "customer-welcome-shell" });
  const router = useRouter();
  const pathname = usePathname() || "";
  const reducedMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user) as
    | { id?: string; _id?: string; name?: string; role?: string }
    | null;
  const rawName = user?.name || "Customer";
  const safeName = useMemo(
    () => sanitizeUserText(rawName).replace(/[<>`]/g, "").trim() || "Customer",
    [rawName],
  );
  const userId = user?._id || user?.id;
  const [show, setShow] = useState(mode === "page");
  const [step, setStep] = useState<1 | 2>(1);
  const [introReady, setIntroReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode === "page") {
      if (hasSeen(userId)) {
        router.replace("/customer/bills");
        return;
      }
      setStep(1);
      setIntroReady(false);
      setShow(true);
      return;
    }
    if (pathname === "/customer/welcome") {
      setShow(false);
      return;
    }
    if (user?.role !== "customer") return;
    setStep(1);
    setIntroReady(false);
    setShow(!hasSeen(userId));
  }, [mode, pathname, router, user?.role, userId]);

  useEffect(() => {
    if (!show || step !== 1) return;
    const timer = window.setTimeout(() => setIntroReady(true), reducedMotion ? 600 : 2600);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, show, step]);

  const continueToDashboard = () => {
    markSeen(userId);
    setShow(false);
    router.replace("/customer/bills");
  };

  if (!mounted || !show) return null;

  const isGate = mode === "gate";

  const wrapperClasses = isGate
    ? "fixed inset-0 z-[9999]"
    : "relative min-h-full";

  const content = (
    <motion.section
      className={wrapperClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-slate-950/95">
        <FloatingBackground />
      </div>
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-start px-3 py-[max(1.25rem,env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:justify-center sm:px-6 lg:px-10">
          <motion.div
            key={step}
            className="w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-slate-950/84 shadow-2xl shadow-black/45 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {step === 1 ? (
              <div className="relative overflow-hidden p-5 sm:p-8 lg:p-10">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
                <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
                <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
                      <Sparkles className="h-3.5 w-3.5" />
                      Jambh Electrics service app
                    </div>
                    <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-6xl">
                      Welcome,
                      <span className="block bg-[linear-gradient(90deg,#60a5fa,#fbbf24,#22d3ee,#60a5fa)] bg-[length:260%_100%] bg-clip-text text-transparent motion-safe:animate-[welcome-gradient_7s_ease-in-out_infinite]">
                        {safeName}
                      </span>
                    </h1>
                    <div className="mt-5">
                      <TypewriterLine text={welcomeLine} />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                      transition={{ duration: 0.25 }}
                      className="mt-6"
                    >
                      {introReady && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-10 bg-orange-400 px-5 font-semibold text-slate-950 hover:bg-orange-300"
                          onClick={() => setStep(2)}
                        >
                          Continue
                        </Button>
                      )}
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    {quickActions.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.label}
                          className="rounded-lg border border-white/10 bg-white/[0.06] p-4 text-slate-100"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.08 }}
                        >
                          <Icon className="h-6 w-6 text-orange-200" />
                          <p className="mt-3 text-sm font-semibold leading-5">
                            {item.label}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 rounded-lg border border-orange-300/20 bg-orange-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-100">
                      Customer dashboard guide
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      These are the main tools available after login. You can open this Guide again from the customer menu.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 shrink-0 bg-orange-400 px-5 font-semibold text-slate-950 hover:bg-orange-300"
                    onClick={continueToDashboard}
                  >
                    Continue to app
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <GuideCard
                    title="Hindi Guide"
                    greeting={`स्वागत है ${safeName}`}
                    details={hindiDetails}
                    safety="सुरक्षा: अपना OTP या password किसी के साथ share न करें."
                    className="order-1 md:order-2"
                  />
                  <GuideCard
                    title="English Guide"
                    greeting={`Welcome ${safeName}`}
                    details={englishDetails}
                    safety="Security: never share your OTP or password with anyone."
                    className="order-2 md:order-1"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 border-white/15 bg-slate-950/60 px-4 text-white hover:bg-slate-900 md:hidden"
                    onClick={continueToDashboard}
                  >
                    Continue to app
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );

  if (mode === "gate") {
    return createPortal(content, document.body);
  }

  return content;
}
