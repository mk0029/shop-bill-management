"use client";

import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { InstallDialog } from "@/components/pwa/install-dialog";

export default function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, promptInstall, isStandalone } = usePwaInstall();
  const [open, setOpen] = useState(false);

  if (isStandalone) return null; // hide when installed

  return (
    <>
      <button
        onClick={async () => {
          if (canInstall) {
            await promptInstall();
          } else {
            setOpen(true);
          }
        }}
        className={`inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 ${className}`}
        title="Install this app"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M3 21h18" />
        </svg>
        Install App
      </button>

      <InstallDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
