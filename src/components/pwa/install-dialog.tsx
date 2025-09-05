"use client";

import { useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const info = useMemo(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isEdge = /edg\//.test(ua);
    const isChrome = /chrome\//.test(ua) && !isEdge;
    const isDesktop = !isAndroid && !isIOS;

    if (isIOS) {
      return {
        title: "Install on iPhone / iPad",
        steps: [
          "Tap the Share icon (square with an up arrow)",
          "Choose 'Add to Home Screen'",
          "Tap Add",
        ],
      } as const;
    }
    if (isAndroid) {
      return {
        title: "Install on Android",
        steps: [
          "Open the browser menu (⋮)",
          "Tap 'Install app' or 'Add to Home screen'",
          "Confirm Install",
        ],
      } as const;
    }
    if (isDesktop && (isChrome || isEdge)) {
      return {
        title: "Install on Desktop",
        steps: [
          "Click the install icon in the address bar",
          "Or open the browser menu and choose 'Install app'",
        ],
      } as const;
    }
    return {
      title: "Install this App",
      steps: [
        "Open your browser menu",
        "Choose 'Install app' or 'Add to Home screen'",
      ],
    } as const;
  }, []);

  return (
    <Modal isOpen={open} onClose={onClose} title={info.title} size="sm">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Badge className="bg-sky-600/20 text-sky-400 border-sky-700">Install</Badge>
          <div className="flex-1">
            <ol className="list-decimal list-inside text-slate-300 text-sm space-y-1">
              {info.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="text-xs text-slate-400 mt-3">After installing, this app opens full-screen and works offline.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose} className="min-w-20">Close</Button>
        </div>
      </div>
    </Modal>
  );
}
