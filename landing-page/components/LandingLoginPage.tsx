"use client";

import { LoginForm } from "@landing/components/forms/login-form";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import { motion, useReducedMotion } from "framer-motion";
import {
  BatteryCharging,
  Cable,
  Fan,
  Info,
  Lightbulb,
  Plug,
  Wrench,
  Zap,
} from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { setCookie } from "@/lib/cookies";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const floatingIcons = [
  { Icon: Cable, left: "7%", top: "17%", delay: 0, size: "h-8 w-8" },
  { Icon: Plug, left: "18%", top: "74%", delay: 0.5, size: "h-7 w-7" },
  { Icon: Lightbulb, left: "38%", top: "13%", delay: 0.9, size: "h-9 w-9" },
  { Icon: Fan, left: "71%", top: "18%", delay: 0.2, size: "h-8 w-8" },
  {
    Icon: BatteryCharging,
    left: "84%",
    top: "68%",
    delay: 0.7,
    size: "h-8 w-8",
  },
  { Icon: Wrench, left: "61%", top: "81%", delay: 1.1, size: "h-7 w-7" },
  { Icon: Zap, left: "91%", top: "31%", delay: 0.35, size: "h-7 w-7" },
];

function isStaffRole(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function ElectricalLoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: "#0B0D12" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.05) 0%, transparent 50%)" }} />
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
      <div className="absolute left-[-10%] top-[24%] h-px w-[120%] rotate-[-7deg]" style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)" }} />
      <div className="absolute left-[-8%] top-[68%] h-px w-[116%] rotate-[5deg]" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)" }} />

      {floatingIcons.map(({ Icon, left, top, delay, size }) => (
        <motion.div
          key={`${left}-${top}`}
          className="absolute grid h-14 w-14 place-items-center rounded-full border border-white/5 bg-white/[0.03] text-sky-300/40 shadow-lg backdrop-blur-sm"
          style={{ left, top }}
          initial={{ opacity: 0, y: 8, rotate: -4 }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            y: [-8, 10, -8],
            rotate: [-5, 6, -5],
          }}
          transition={{
            duration: 7 + delay,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Icon className={size} />
        </motion.div>
      ))}

      <div className="absolute inset-0" style={{ backdropFilter: "blur(2px)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.6) 100%)" }} />
    </div>
  );
}

export default function LandingLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, role, hydrated } = useAuthStore();
  const { t } = useLocaleStore();
  const [error, setError] = useState<string | null>(null);

  const phone = searchParams?.get("phone") || "";
  const passKey = searchParams?.get("passKey") || "";

  const friendlyLoginError = (message: string) => {
    if (message === "device-inactive" || message.includes("device-inactive")) {
      return "This device notification session was inactive. Please try signing in again.";
    }
    if (message.includes("device-registration")) {
      return "We could not refresh this device session. Please try again.";
    }
    return message;
  };

  const handleLogin = async (credentials: {
    phone: string;
    secretKey: string;
    rememberMe?: boolean;
  }) => {
    try {
      setError(null);
      const remember = credentials.rememberMe ? "true" : "false";
      setCookie("auth-remember", remember, {
        days: credentials.rememberMe ? 30 : undefined,
        path: "/",
        sameSite: "Lax",
      });

      await login(credentials);

      const { role } = useAuthStore.getState();
      if (isStaffRole(role)) {
        router.push("/admin");
      } else {
        router.push("/customer/bills");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";

      if (
        errorMessage.includes("Customer not found") ||
        errorMessage.includes("not found")
      ) {
        router.push("/customer-not-found");
        return;
      }

      setError(friendlyLoginError(errorMessage));
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      if (isStaffRole(role)) {
        router.replace("/admin");
      } else {
        router.replace("/customer/bills");
      }
    }
  }, [hydrated, isAuthenticated, role, router]);

  return (
    <div className="relative min-h-[100dvh]">
      <ElectricalLoginBackground />
      <div
        className="absolute inset-0 z-[5] cursor-pointer"
        onClick={() => router.push("/")}
      />
      <div className="absolute inset-0 z-[6] overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-start px-3 py-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:justify-center sm:px-6 sm:py-6 lg:px-10">
          <ClientOnly>
            <motion.main
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="w-full max-w-lg overflow-hidden rounded-[1.25rem] glass-strong shadow-2xl"
            >
              <section className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Link
                href="/"
                className="glass-button inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#B8C0CC] hover:text-white transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="glass-card-static p-5 sm:p-6">
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.12, type: "spring", stiffness: 180 }}
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl glass shadow-lg"
                >
                  <Image
                    src="/je-p-512.png"
                    alt="Jambh Electrics"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    priority
                  />
                </motion.div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  {t("auth.welcomeBack")}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-normal text-white">
                  {t("auth.login")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#B8C0CC]">
                  {t("auth.signInToContinue")}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-xl border border-red-400/15 bg-red-950/30 px-4 py-2.5"
                >
                  <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                </motion.div>
              )}

              <LoginForm
                onSubmit={handleLogin}
                isLoading={isLoading}
                error={error ?? undefined}
                initialValues={{
                  phone: phone || undefined,
                  secretKey: passKey || undefined,
                }}
              />
            </div>

            <div className="mt-6 text-center text-xs text-white/30">
              <p>{new Date().getFullYear()} {t("app.title")}</p>
              <p className="mt-1">{t("auth.professionalSystem")}</p>
            </div>
          </section>
        </motion.main>
      </ClientOnly>
        </div>
      </div>
    </div>
  );
}
