"use client";

import { useEffect, useState } from "react";
import { LogIn, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  clearAutoLogoutInfo,
  getAutoLogoutInfo,
  type AutoLogoutInfo,
} from "@/lib/auto-logout";
import { Button } from "@/components/ui/button";

export default function AutoLogoutPage() {
  const router = useRouter();
  const [info, setInfo] = useState<AutoLogoutInfo | null>(null);

  useEffect(() => {
    setInfo(getAutoLogoutInfo());
  }, []);

  const message =
    info?.message ||
    "Your account has been logged out from this device because it was logged in on another device.";

  return (
    <main className="h-[var(--app-vh,100dvh)] bg-neutral-950 text-white">
      <div className="mx-auto flex h-[var(--app-vh,100dvh)] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-400/25">
          <Smartphone className="h-11 w-11" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-semibold tracking-normal">
          Logged out from this device
        </h1>
        <p className="mt-4 text-sm leading-6 text-neutral-300">{message}</p>

        {info?.loggedInOn ? (
          <div className="mt-6 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-left">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Logged in on
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-100">
              {info.loggedInOn}
            </p>
          </div>
        ) : null}

        <Button
          className="mt-8 w-full bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
          onClick={() => {
            clearAutoLogoutInfo();
            router.replace("/login");
          }}
        >
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          Log in again
        </Button>
      </div>
    </main>
  );
}
