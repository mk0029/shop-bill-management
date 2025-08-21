"use client";

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

// A small unobtrusive install banner that auto-prompts once if app is installable
export default function PWAInstaller() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const { setDeferredPrompt, isStandalone } = usePwaInstall();

  useEffect(() => {
    // Already installed? hide
    if (isStandalone) return;

    const onBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar on mobile
      e.preventDefault();
      setPromptEvent(e);
      setIsInstallable(true);
      setDeferredPrompt(e);

      // Auto prompt once per browser (persisted key)
      const KEY = "pwa-install-auto-prompted";
      const alreadyPrompted = localStorage.getItem(KEY) === "1";
      if (!alreadyPrompted) {
        localStorage.setItem(KEY, "1");
        // show our banner; prompt must be triggered by user gesture (button click)
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

  if (!isInstallable) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-4 mx-auto w-[92%] max-w-md rounded-xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur transition-all ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-center gap-3">
        <img src="/vercel.svg" alt="App" className="h-8 w-8" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">Install Electrician Shop Management</p>
          <p className="text-xs text-slate-300">Get a faster, full-screen experience</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVisible(false)}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Later
          </button>
          <button
            onClick={async () => {
              try {
                // Must be called in a user gesture handler
                const ev = promptEvent;
                if (!ev) return;
                await ev.prompt();
                // Optionally read the user's choice (accepted or dismissed)
                // Some browsers expose a Promise at ev.userChoice
                // @ts-ignore
                const outcome = ev.userChoice ? await ev.userChoice : undefined;
                // hide after interaction in any case
                setVisible(false);
                setPromptEvent(null);
                setIsInstallable(false);
              } catch {
                // ignore
              }
            }}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-500"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
