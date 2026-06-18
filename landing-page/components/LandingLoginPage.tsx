"use client";

import { LoginForm } from "@landing/components/forms/login-form";
import { Card } from "@/components/ui/card";
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
  const reducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#070b15]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.20),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(249,115,22,0.18),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[-10%] top-[24%] h-px w-[120%] rotate-[-7deg] bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
      <div className="absolute left-[-8%] top-[68%] h-px w-[116%] rotate-[5deg] bg-gradient-to-r from-transparent via-orange-300/25 to-transparent" />

      {floatingIcons.map(({ Icon, left, top, delay, size }) => (
        <motion.div
          key={`${left}-${top}`}
          className="absolute grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-cyan-100/55 shadow-[0_0_40px_rgba(34,211,238,0.10)] backdrop-blur-sm"
          style={{ left, top }}
          initial={{ opacity: 0, y: 8, rotate: -4 }}
          animate={
            reducedMotion
              ? { opacity: 0.36 }
              : {
                  opacity: [0.22, 0.48, 0.28],
                  y: [-8, 10, -8],
                  rotate: [-5, 6, -5],
                }
          }
          transition={{
            duration: 7 + delay,
            delay,
            repeat: reducedMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <Icon className={size} />
        </motion.div>
      ))}

      <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07101f]/45 to-[#050914]/85" />
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
        router.push("/admin/welcome");
      } else {
        router.push("/customer/welcome");
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
        router.replace("/admin/welcome");
      } else {
        router.replace("/customer/welcome");
      }
    }
  }, [hydrated, isAuthenticated, role, router]);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <ElectricalLoginBackground />
      <ClientOnly>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/62 shadow-2xl shadow-black/45 backdrop-blur-2xl"
        >
          <section className="p-4 sm:p-5">
            <Card className="border-white/10 bg-slate-950/72 p-5 shadow-none backdrop-blur-xl sm:p-6">
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.12, type: "spring", stiffness: 180 }}
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900 shadow-lg shadow-cyan-950/30"
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                  Welcome back
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-white">
                  {t("auth.login")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Sign in to continue to your Jambh Electrics workspace.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6 rounded-xl border border-red-400/35 bg-red-950/55 px-4 py-3 text-red-100"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
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
            </Card>

            <div className="mt-6 text-center text-xs text-slate-600">
              <p>{new Date().getFullYear()} Jambh Electrics</p>
              <p className="mt-1">Professional Jambh Electrics system</p>
            </div>
          </section>
        </motion.main>
      </ClientOnly>
    </div>
  );
}
