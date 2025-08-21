"use client";

import { create } from "zustand";

// Lightweight global store to hold the deferred install prompt
interface PwaInstallState {
  deferredPrompt: any | null; // BeforeInstallPromptEvent (not typed in TS lib)
  setDeferredPrompt: (e: any | null) => void;
}

const usePwaInstallStore = create<PwaInstallState>((set) => ({
  deferredPrompt: null,
  setDeferredPrompt: (e) => set({ deferredPrompt: e }),
}));

export function usePwaInstall() {
  const deferredPrompt = usePwaInstallStore((s) => s.deferredPrompt);
  const setDeferredPrompt = usePwaInstallStore((s) => s.setDeferredPrompt);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      (window as any).navigator?.standalone === true);

  const canInstall = !!deferredPrompt && !isStandalone;

  const promptInstall = async () => {
    if (!deferredPrompt) return { outcome: undefined } as const;
    try {
      await deferredPrompt.prompt();
      // @ts-ignore some browsers expose a promise here
      const outcome = deferredPrompt.userChoice ? await deferredPrompt.userChoice : undefined;
      setDeferredPrompt(null);
      return { outcome } as const;
    } catch (e) {
      setDeferredPrompt(null);
      return { outcome: undefined } as const;
    }
  };

  return { canInstall, promptInstall, isStandalone, deferredPrompt, setDeferredPrompt } as const;
}
