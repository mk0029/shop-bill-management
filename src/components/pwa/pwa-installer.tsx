"use client";

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISS_COUNT_KEY = "pwa-install-dismiss-count";
const DISMISS_TIME_KEY = "pwa-install-dismiss-time";
const MAX_DISMISS = 3;
const RE_SHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDismissCount(): number {
  try {
    return parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0", 10);
  } catch { return 0; }
}

function getDismissTime(): number {
  try {
    return parseInt(localStorage.getItem(DISMISS_TIME_KEY) || "0", 10);
  } catch { return 0; }
}

function setDismissMeta() {
  try {
    localStorage.setItem(DISMISS_COUNT_KEY, String(getDismissCount() + 1));
    localStorage.setItem(DISMISS_TIME_KEY, String(Date.now()));
  } catch {}
}

function shouldShowBanner(): boolean {
  const count = getDismissCount();
  if (count >= MAX_DISMISS) {
    const last = getDismissTime();
    if (last && Date.now() - last < RE_SHOW_AFTER_MS) return false;
  }
  return true;
}

export default function PWAInstaller() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const { setDeferredPrompt, isStandalone } = usePwaInstall();

  useEffect(() => {
    if (isStandalone) return;

    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPromptEvent(e);
      setIsInstallable(true);
      setDeferredPrompt(e);
      if (shouldShowBanner()) {
        setVisible(true);
      }
    };

    const onAppInstalled = () => {
      setVisible(false);
      setIsInstallable(false);
      setPromptEvent(null);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      // @ts-ignore
      const outcome = promptEvent.userChoice ? await promptEvent.userChoice : undefined;
    } catch {}
    setVisible(false);
    setPromptEvent(null);
    setIsInstallable(false);
  };

  const handleLater = () => {
    setDismissMeta();
    setVisible(false);
  };

  if (!isInstallable || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-4 mx-auto w-[92%] max-w-md rounded-xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur z-50"
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-center gap-3">
        <img src="/je-p-192.png" alt="Jambh Electrics" className="h-8 w-8" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">Install Jambh Electrics</p>
          <p className="text-xs text-slate-300">Get a faster, full-screen experience</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLater}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-500"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
