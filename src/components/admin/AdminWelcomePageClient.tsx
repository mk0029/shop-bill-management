"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Cable,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Lightbulb,
  Plug,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sanitizeUserText } from "@/constants/defaults";
import { useDynamicViewportHeight } from "@/hooks/use-dynamic-viewport-height";
import { useAuthStore } from "@/store/auth-store";

const ADMIN_WELCOME_PREFIX = "admin_welcome_seen";

function seenKey(userId?: string) {
  return `${ADMIN_WELCOME_PREFIX}:${userId || "guest"}`;
}

function hasSeen(userId?: string) {
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markSeen(userId?: string) {
  try {
    window.localStorage.setItem(seenKey(userId), "1");
  } catch {}
}

const floatingItems = [
  { Icon: Gauge, x: "8%", y: "19%", delay: 0, duration: 12 },
  { Icon: Cable, x: "19%", y: "75%", delay: 0.4, duration: 15 },
  { Icon: Zap, x: "82%", y: "22%", delay: 0.8, duration: 13 },
  { Icon: Plug, x: "90%", y: "67%", delay: 1.1, duration: 16 },
  { Icon: Lightbulb, x: "46%", y: "12%", delay: 0.2, duration: 14 },
  { Icon: Wrench, x: "57%", y: "82%", delay: 0.9, duration: 15 },
];

const staffTools = [
  { label: "Dashboard control", Icon: Gauge },
  { label: "Customer service", Icon: Users },
  { label: "Work tracking", Icon: ClipboardList },
  { label: "Live alerts", Icon: Bell },
];

function StaffBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050914]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_82%_26%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_48%_92%,rgba(59,130,246,0.14),transparent_26%),linear-gradient(135deg,#020617,#071426_50%,#111827)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.13)_1px,transparent_1px)] [background-size:46px_46px]" />
      <div className="absolute left-[-10%] top-[42%] h-px w-[120%] rotate-[-6deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      <div className="absolute left-[-10%] top-[64%] h-px w-[120%] rotate-[5deg] bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

      {floatingItems.map(({ Icon, x, y, delay, duration }) => (
        <motion.div
          key={`${x}-${y}`}
          className="absolute grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-slate-950/45 text-sky-100/55 shadow-lg shadow-black/25 backdrop-blur-md"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, y: 8 }}
          animate={
            reducedMotion
              ? { opacity: 0.38 }
              : {
                  opacity: [0.24, 0.5, 0.28],
                  y: [-8, 12, -8],
                  rotate: [-4, 5, -4],
                }
          }
          transition={{
            duration,
            delay,
            repeat: reducedMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      ))}
      <div className="absolute inset-0 bg-slate-950/42 backdrop-blur-[4px]" />
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(reducedMotion ? text : "");

  useEffect(() => {
    if (reducedMotion) {
      setValue(text);
      return;
    }
    setValue("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setValue(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 20);
    return () => window.clearInterval(timer);
  }, [reducedMotion, text]);

  return (
    <p className="min-h-[4.5rem] max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
      {value}
      {!reducedMotion && value.length < text.length && (
        <span className="ml-1 inline-block h-5 w-0.5 translate-y-1 bg-orange-300" />
      )}
    </p>
  );
}

export default function AdminWelcomePageClient() {
  useDynamicViewportHeight({ shellClassName: "admin-welcome-shell" });
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user) as
    | { id?: string; _id?: string; name?: string }
    | null;
  const userId = user?._id || user?.id;
  const safeName = useMemo(
    () =>
      sanitizeUserText(user?.name || "Team")
        .replace(/[<>`]/g, "")
        .trim() || "Team",
    [user?.name],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasSeen(userId)) router.replace("/admin/dashboard");
  }, [router, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), reducedMotion ? 650 : 2400);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  const continueToDashboard = () => {
    markSeen(userId);
    router.replace("/admin/dashboard");
  };

  return (
    <section className="fixed inset-0 z-50">
      <div className="pointer-events-none absolute inset-0">
        <StaffBackground />
      </div>
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-start px-3 py-[max(1.25rem,env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:justify-center sm:px-6 lg:px-10">
          <motion.div
            className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-slate-950/82 shadow-2xl shadow-black/45 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="relative overflow-hidden p-5 sm:p-8 lg:p-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-xs font-semibold text-orange-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Admin workspace ready
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900">
                    <Image
                      src="/je-p-512.png"
                      alt="Jambh Electrics"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">
                      Jambh Electrics
                    </p>
                    <h1 className="mt-1 text-3xl font-bold leading-tight text-white sm:text-5xl">
                      Welcome,
                      <span className="block bg-[linear-gradient(90deg,#38bdf8,#f59e0b,#22c55e,#38bdf8)] bg-[length:260%_100%] bg-clip-text text-transparent motion-safe:animate-[welcome-gradient_7s_ease-in-out_infinite]">
                        {safeName}
                      </span>
                    </h1>
                  </div>
                </div>

                <div className="mt-6">
                  <Typewriter text="Your admin dashboard is ready for customer management, service updates, billing, stock checks, team coordination, and live notifications." />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6"
                >
                  {ready && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 bg-orange-400 px-5 font-semibold text-slate-950 hover:bg-orange-300"
                      onClick={continueToDashboard}
                    >
                      Continue to dashboard
                    </Button>
                  )}
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {staffTools.map(({ label, Icon }, index) => (
                  <motion.div
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/[0.06] p-4 text-slate-100"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.08 }}
                  >
                    <Icon className="h-6 w-6 text-orange-200" />
                    <p className="mt-3 text-sm font-semibold leading-5">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative mt-7 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/10 p-3 text-sm text-emerald-50">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
              <span>Staff access is active. Continue to open the dashboard.</span>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}
