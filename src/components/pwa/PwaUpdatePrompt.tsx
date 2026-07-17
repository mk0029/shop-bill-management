"use client";

import { useEffect, useState } from "react";

type SwState = {
  waiting: boolean;
  registration: ServiceWorkerRegistration | null;
};

export function PwaUpdatePrompt() {
  const [state, setState] = useState<SwState>({
    waiting: false,
    registration: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handler = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setState({ waiting: true, registration: reg });
      }
    };

    navigator.serviceWorker.ready.then(handler);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then(handler);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    state.registration?.waiting?.postMessage("SKIP_WAITING");
    setState({ waiting: false, registration: null });
  };

  if (!state.waiting) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white shadow-lg">
      <span className="text-sm">A new version is available.</span>
      <button
        onClick={handleUpdate}
        className="rounded bg-white px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        Update
      </button>
    </div>
  );
}
